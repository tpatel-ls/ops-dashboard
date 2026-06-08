'use client';

import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@drift/core';
import type { Task, Project, Routine, RoutineCheck, Domain, JournalEntry } from '@drift/core';
import { ViewShell } from '@/components/view-shell';
import { ChatPanel } from '@/components/chat-panel';
import type { ChatMessage } from '@/components/chat-panel';

/* ─── context builder ────────────────────────────────────────────── */

const MAX_CONTEXT = 50_000;

function buildContext(
  tasks: Task[],
  projects: Project[],
  routines: Routine[],
  checks: RoutineCheck[],
  domains: Domain[],
  journal: JournalEntry[],
): string {
  const todayISO = new Date().toISOString().slice(0, 10);
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const domainMap = new Map(domains.map((d) => [d.id, d]));

  const lines: string[] = [];

  // --- Domains ---
  const activeDomains = domains.filter((d) => !d.archivedAt);
  if (activeDomains.length > 0) {
    lines.push('=== LIFE DOMAINS ===');
    for (const d of activeDomains) {
      lines.push(`- ${d.name}${d.description ? `: ${d.description}` : ''}`);
    }
    lines.push('');
  }

  // --- Open tasks (not done / not archived) ---
  const openTasks = tasks.filter(
    (t) => t.status !== 'done' && t.status !== 'archived',
  );
  if (openTasks.length > 0) {
    lines.push('=== OPEN TASKS ===');
    for (const t of openTasks) {
      const proj = t.projectId ? projectMap.get(t.projectId) : undefined;
      const parts: string[] = [`[${t.status.toUpperCase()}]`, t.title];
      if (t.dueAt) parts.push(`due:${t.dueAt.slice(0, 10)}`);
      if (t.priority > 0) parts.push(`priority:${t.priority}`);
      if (proj) parts.push(`project:${proj.name}`);
      if (t.tags.length > 0) parts.push(`tags:${t.tags.join(',')}`);
      lines.push('- ' + parts.join(' | '));
    }
    lines.push('');
  }

  // --- Active projects ---
  const activeProjects = projects.filter((p) => p.status === 'active' || p.status === 'paused');
  if (activeProjects.length > 0) {
    lines.push('=== PROJECTS ===');
    for (const p of activeProjects) {
      const dom = p.domainId ? domainMap.get(p.domainId) : undefined;
      const parts: string[] = [`[${p.kind}/${p.status}]`, p.name];
      if (dom) parts.push(`domain:${dom.name}`);
      if (p.dueDate) parts.push(`due:${p.dueDate}`);
      if (p.description) parts.push(`desc:${p.description.slice(0, 80)}`);
      lines.push('- ' + parts.join(' | '));
    }
    lines.push('');
  }

  // --- Active routines + today completion ---
  const activeRoutines = routines.filter((r) => !r.archivedAt);
  if (activeRoutines.length > 0) {
    lines.push('=== ROUTINES ===');
    for (const r of activeRoutines) {
      const doneToday = checks.some(
        (c) => c.routineId === r.id && c.date === todayISO && c.done,
      );
      lines.push(`- ${r.name} [${r.timeOfDay}] today:${doneToday ? 'done' : 'pending'}`);
    }
    lines.push('');
  }

  // --- Recent journal entries (last 14 days) ---
  const cutoff = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  const recentJournal = journal
    .filter((j) => j.date >= cutoff)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);
  if (recentJournal.length > 0) {
    lines.push('=== RECENT JOURNAL (last 14 days) ===');
    for (const j of recentJournal) {
      const excerpt = (j.body ?? '').slice(0, 160).replace(/\n/g, ' ');
      lines.push(`- [${j.date}] ${excerpt}${(j.body ?? '').length > 160 ? '…' : ''}`);
    }
    lines.push('');
  }

  const ctx = lines.join('\n');
  return ctx.length > MAX_CONTEXT ? ctx.slice(0, MAX_CONTEXT) : ctx;
}

/* ─── unique id helper ───────────────────────────────────────────── */

let _counter = 0;
function uid() {
  return `msg-${Date.now()}-${++_counter}`;
}

/* ─── AskPage ────────────────────────────────────────────────────── */

export default function AskPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [noKey, setNoKey] = useState(false);

  const data = useLiveQuery(async () => {
    const db = getDb();
    const [tasks, projects, routines, checks, domains, journal] = await Promise.all([
      db.tasks.toArray(),
      db.projects.toArray(),
      db.routines.toArray(),
      db.routineChecks.toArray(),
      db.domains.toArray(),
      db.journalEntries.toArray(),
    ]);
    return {
      tasks: tasks.filter((t) => !t.deletedAt),
      projects: projects.filter((p) => !p.deletedAt),
      routines: routines.filter((r) => !r.deletedAt),
      checks: checks.filter((c) => !c.deletedAt),
      domains: domains.filter((d) => !d.deletedAt),
      journal: journal.filter((j) => !j.deletedAt),
    };
  });

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');
    setNoKey(false);

    // Add user message
    const userMsg: ChatMessage = { id: uid(), role: 'user', text: question };
    const placeholderId = uid();
    const placeholder: ChatMessage = {
      id: placeholderId,
      role: 'assistant',
      text: '',
      loading: true,
    };
    setMessages((prev) => [...prev, userMsg, placeholder]);
    setLoading(true);

    // Build context from Dexie data
    const context = data
      ? buildContext(
          data.tasks,
          data.projects,
          data.routines,
          data.checks,
          data.domains,
          data.journal,
        )
      : '(No local data available yet.)';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context }),
      });

      const json = (await res.json()) as
        | { ok: true; answer: string }
        | { ok: false; reason: string };

      if (!json.ok) {
        if (json.reason === 'no-key') {
          setNoKey(true);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === placeholderId
                ? {
                    ...m,
                    loading: false,
                    error: true,
                    text: 'No API key configured. Add ANTHROPIC_API_KEY to .env.local.',
                  }
                : m,
            ),
          );
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === placeholderId
                ? {
                    ...m,
                    loading: false,
                    error: true,
                    text: 'Something went wrong. Please try again.',
                  }
                : m,
            ),
          );
        }
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? { ...m, loading: false, text: json.answer }
              : m,
          ),
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? {
                ...m,
                loading: false,
                error: true,
                text: 'Network error. Check your connection and try again.',
              }
            : m,
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [input, loading, data]);

  return (
    <ViewShell
      eyebrow="More"
      title="Ask"
      subtitle="Chat with everything in your dashboard — tasks, projects, routines, journal, and more."
    >
      <ChatPanel
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        loading={loading}
        noKey={noKey}
      />
    </ViewShell>
  );
}
