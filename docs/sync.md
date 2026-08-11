# Sync

Sync is optional and disabled by default. When enabled, the browser keeps the
local Dexie database as the immediate source of truth and uses Supabase to move
changes between signed-in devices.

## Record metadata

Each synchronized record includes:

- `version`: a non-negative logical version incremented on local mutations
- `deviceId`: a stable identifier for the browser profile
- `updatedAt`: an ISO timestamp for ordering equal versions
- `deletedAt`: an optional soft-delete timestamp

## Local mutations and outbox

Mutation helpers write the record to Dexie, then coalesce an operation into the
`syncOps` outbox when sync is enabled. The sync engine drains operations in
creation order. A failed table is deferred for the rest of that drain so other
tables can continue, and failed operations remain queued for a later retry.

Deletes are synchronized as tombstones rather than hard deletes.

## Startup and recurring cycles

On startup, the engine:

1. Verifies Supabase configuration and the current session.
2. Backfills existing local records once per signed-in user.
3. Pulls every synchronized table from its saved cursor.
4. Opens Supabase Realtime subscriptions.
5. Drains the local outbox.

After startup, an online event, a local mutation, or the 20-second safety timer
starts a cycle. Each cycle pushes the outbox first and then performs a catch-up
pull. Pulls are paginated and keep a separate cursor for every table. A two-minute
overlap protects against modest clock skew and makes replayed rows harmless.

## Conflict resolution

Records use whole-record last-write-wins resolution:

1. A valid higher `version` wins.
2. At equal versions, a valid later `updatedAt` wins.
3. At an exact metadata tie, a tombstone wins over a live record.
4. Remaining ties use `deviceId`, then canonical record content, so every device
   makes the same choice.

The Postgres sync guard rejects older updates. Incoming Realtime and catch-up
rows use the same client-side winner selection before writing to Dexie.

## Storage and failure behavior

- Network or provider failure leaves operations queued and reports an offline or
  error state without blocking local work.
- Missing authentication reports a signed-out state and restarts sync after sign-in.
- Browser storage failures fall back safely, but persistent cursor and backfill
  markers normally use local storage.
- A per-table pull cursor advances only after every page for that table succeeds.
- Stopping or restarting sync invalidates in-flight startup work before new
  listeners, timers, or channels are installed.
