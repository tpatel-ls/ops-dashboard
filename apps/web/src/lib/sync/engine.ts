'use client';

import { getDb } from '@drift/core';
import type { Syncable } from '@drift/core';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { setSyncStatus } from './status';
import {
  DEXIE_TABLES,
  SYNC_TABLES,
  fromRow,
  isSyncedTable,
  toRow,
  type DexieTableName,
} from './mapping';

const CURSOR_KEY = 'drift.sync.cursor';
const EPOCH = '1970-01-01T00:00:00Z';
const MAX_ATTEMPTS = 12;
const DRAIN_BATCH = 100;
const BACKFILL_CHUNK = 200;
const SAFETY_INTERVAL_MS = 20_000;
const KICK_DEBOUNCE_MS = 300;

let started = false;
let starting: Promise<void> | null = null;
let channel: RealtimeChannel | null = null;
let safetyTimer: number | null = null;
let kickTimer: number | null = null;
let draining = false;
let authSub: { unsubscribe: () => void } | null = null;

function db() {
  return getDb();
}

function remoteIsNewer(local: Syncable | undefined, remote: Syncable): boolean {
  if (!local) return true;
  if (remote.version > local.version) return true;
  if (remote.version < local.version) return false;
  return remote.updatedAt > local.updatedAt;
}

async function getLocalRow(table: DexieTableName, id: string): Promise<Syncable | undefined> {
  return (await db().table(table).get(id)) as Syncable | undefined;
}

async function putLocalRow(table: DexieTableName, rec: Syncable): Promise<void> {
  // Direct Dexie write — NOT through the mutation helpers — so inbound merges
  // never re-enqueue an outbound op (which would loop).
  await db().table(table).put(rec);
}

/** Apply a remote row locally only when it is strictly newer (skips echoes). */
async function mergeInbound(table: DexieTableName, row: Record<string, unknown>): Promise<void> {
  const rec = fromRow(row);
  if (!rec?.id) return;
  const local = await getLocalRow(table, rec.id);
  if (!remoteIsNewer(local, rec)) return;
  await putLocalRow(table, rec);
}

async function updatePending(): Promise<void> {
  const pending = await db().syncOps.count();
  setSyncStatus({ pending });
}

// ---- Push (outbox -> Supabase) --------------------------------------------

async function drainOutbox(supabase: SupabaseClient, userId: string): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    let more = true;
    while (more) {
      const ops = await db().syncOps.orderBy('createdAt').limit(DRAIN_BATCH).toArray();
      if (!ops.length) break;
      more = ops.length === DRAIN_BATCH;

      for (const op of ops) {
        if (!isSyncedTable(op.table)) {
          await db().syncOps.delete(op.id);
          continue;
        }
        const dbTable = SYNC_TABLES[op.table];
        const row = toRow(op.payload as Record<string, unknown>, userId);
        // Both 'put' and 'delete' upsert the record; a delete is a tombstone
        // (deletedAt set). The DB version-guard trigger prevents clobbering a
        // newer remote, so a stale push is a harmless no-op.
        const { error } = await supabase.from(dbTable).upsert(row);
        if (error) {
          const attempts = (op.attempts ?? 0) + 1;
          if (attempts >= MAX_ATTEMPTS) {
            await db().syncOps.delete(op.id);
          } else {
            await db().syncOps.update(op.id, { attempts, lastError: error.message });
          }
          // Back off — likely offline or transient; retry on the next cycle.
          throw error;
        }
        await db().syncOps.delete(op.id);
      }
    }
  } finally {
    draining = false;
    await updatePending();
  }
}

// ---- Pull (Supabase -> local) ---------------------------------------------

async function pull(supabase: SupabaseClient): Promise<void> {
  const cursor = (typeof window !== 'undefined' && window.localStorage.getItem(CURSOR_KEY)) || EPOCH;
  let maxSeen = cursor;

  for (const table of DEXIE_TABLES) {
    const dbTable = SYNC_TABLES[table];
    const { data, error } = await supabase
      .from(dbTable)
      .select('*')
      .gte('updated_at', cursor)
      .order('updated_at', { ascending: true })
      .limit(1000);
    if (error || !data) continue;
    for (const row of data as Array<Record<string, unknown>>) {
      await mergeInbound(table, row);
      const ts = row.updated_at;
      if (typeof ts === 'string' && ts > maxSeen) maxSeen = ts;
    }
  }
  if (typeof window !== 'undefined') window.localStorage.setItem(CURSOR_KEY, maxSeen);
}

// ---- Backfill (one-time full push of pre-existing local data) --------------

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function backfillIfNeeded(supabase: SupabaseClient, userId: string): Promise<void> {
  const key = `drift.sync.backfilled.${userId}`;
  if (typeof window !== 'undefined' && window.localStorage.getItem(key) === '1') return;

  for (const table of DEXIE_TABLES) {
    const rows = (await db().table(table).toArray()) as Array<Record<string, unknown>>;
    if (!rows.length) continue;
    for (const batch of chunk(rows, BACKFILL_CHUNK)) {
      const mapped = batch.map((r) => toRow(r, userId));
      const { error } = await supabase.from(SYNC_TABLES[table]).upsert(mapped);
      if (error) throw error; // leave the flag unset so we retry next start
    }
  }
  if (typeof window !== 'undefined') window.localStorage.setItem(key, '1');
}

// ---- Realtime --------------------------------------------------------------

function subscribeRealtime(supabase: SupabaseClient): void {
  channel = supabase.channel('drift-sync');
  for (const table of DEXIE_TABLES) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: SYNC_TABLES[table] },
      (payload) => {
        const row = (payload.new ?? payload.old) as Record<string, unknown> | undefined;
        if (row && row.id) void mergeInbound(table, row);
      },
    );
  }
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') setSyncStatus({ state: 'live', error: null });
    else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')
      setSyncStatus({ state: 'error', error: 'realtime' });
    else if (status === 'CLOSED') setSyncStatus({ state: 'offline' });
  });
}

// ---- Lifecycle -------------------------------------------------------------

function scheduleKick(): void {
  if (kickTimer !== null) return;
  kickTimer = window.setTimeout(() => {
    kickTimer = null;
    void cycle();
  }, KICK_DEBOUNCE_MS);
}

/** One push+pull pass using a fresh authenticated client. */
async function cycle(): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) {
    setSyncStatus({ state: 'signed-out' });
    return;
  }
  try {
    await drainOutbox(supabase, session.user.id);
    await pull(supabase);
    setSyncStatus({ state: 'live', error: null, lastSyncedAt: new Date().toISOString() });
  } catch {
    setSyncStatus({ state: navigator.onLine ? 'error' : 'offline' });
  }
}

function onKickEvent(): void {
  scheduleKick();
}
function onOnline(): void {
  void cycle();
}

export async function startSync(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (started) return;
  if (starting) return starting;

  starting = (async () => {
    const supabase = createClient();
    if (!supabase) {
      setSyncStatus({ state: 'unconfigured' });
      return;
    }
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
      setSyncStatus({ state: 'signed-out' });
      // React to a later login without requiring a manual re-enable.
      if (!authSub) {
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') void restartSync();
          if (event === 'SIGNED_OUT') void stopSync();
        });
        authSub = sub.subscription;
      }
      return;
    }

    setSyncStatus({ state: 'connecting', error: null });
    const userId = session.user.id;

    // Realtime authorization uses the current access token.
    supabase.realtime.setAuth(session.access_token);

    try {
      await backfillIfNeeded(supabase, userId);
      await pull(supabase);
      setSyncStatus({ lastSyncedAt: new Date().toISOString() });
    } catch {
      setSyncStatus({ state: navigator.onLine ? 'error' : 'offline' });
    }

    // Realtime's SUBSCRIBED callback drives the 'live' state from here.
    subscribeRealtime(supabase);
    void drainOutbox(supabase, userId).catch(() => {});
    await updatePending();

    if (!authSub) {
      const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
        if (event === 'TOKEN_REFRESHED' && s) supabase.realtime.setAuth(s.access_token);
        if (event === 'SIGNED_OUT') void stopSync();
      });
      authSub = sub.subscription;
    }

    window.addEventListener('drift:sync-kick', onKickEvent);
    window.addEventListener('online', onOnline);
    safetyTimer = window.setInterval(() => void cycle(), SAFETY_INTERVAL_MS);

    started = true;
  })();

  try {
    await starting;
  } finally {
    starting = null;
  }
}

export async function stopSync(): Promise<void> {
  if (typeof window !== 'undefined') {
    window.removeEventListener('drift:sync-kick', onKickEvent);
    window.removeEventListener('online', onOnline);
  }
  if (safetyTimer !== null) {
    clearInterval(safetyTimer);
    safetyTimer = null;
  }
  if (kickTimer !== null) {
    clearTimeout(kickTimer);
    kickTimer = null;
  }
  if (channel) {
    const supabase = createClient();
    try {
      await supabase?.removeChannel(channel);
    } catch {
      /* ignore */
    }
    channel = null;
  }
  if (authSub) {
    authSub.unsubscribe();
    authSub = null;
  }
  started = false;
  setSyncStatus({ state: 'off' });
}

async function restartSync(): Promise<void> {
  await stopSync();
  await startSync();
}
