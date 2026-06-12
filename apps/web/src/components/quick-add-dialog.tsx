'use client';

import { Sparkles } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useAppStore } from '@/lib/app-store';
import { addTask } from '@/lib/tasks';

export function QuickAddDialog() {
  const open = useAppStore((s) => s.quickAddOpen);
  const close = useAppStore((s) => s.closeQuickAdd);
  const [value, setValue] = useState('');
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    startTransition(async () => {
      await addTask(text);
      setValue('');
      close();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[18vh] backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <form onSubmit={submit} className="surface flex w-full max-w-xl items-center gap-3 px-4 py-3">
        <Sparkles className="size-4 text-primary" aria-hidden />
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={pending}
          placeholder="Capture: ship spec tomorrow 3pm #work !!"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-subtle-foreground"
        />
        <span className="kbd">Enter</span>
      </form>
    </div>
  );
}
