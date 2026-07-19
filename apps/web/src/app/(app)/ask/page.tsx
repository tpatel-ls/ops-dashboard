'use client';

import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@ops-dashboard/core';
import { ViewShell } from '@/components/view-shell';
import { ChatPanel } from '@/components/chat-panel';
import type { ChatMessage } from '@/components/chat-panel';
import { buildWorkContext } from '@/lib/ask-context';

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
    const [tasks, projects, domains, organizations] = await Promise.all([
      db.tasks.toArray(),
      db.projects.toArray(),
      db.domains.toArray(),
      db.organizations.toArray(),
    ]);
    return {
      tasks: tasks.filter((t) => !t.deletedAt),
      projects: projects.filter((p) => !p.deletedAt),
      domains: domains.filter((d) => !d.deletedAt),
      organizations: organizations.filter((organization) => !organization.deletedAt),
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
      ? buildWorkContext(data)
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
      subtitle="Ask across organizations, projects, and open tasks."
      compactHeader
      fullWidth
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
