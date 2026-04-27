'use client';

import { useState, useTransition } from 'react';
import { addTask } from '@/lib/tasks';

export function QuickAdd() {
  const [value, setValue] = useState('');
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    startTransition(async () => {
      await addTask(text);
      setValue('');
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-1 items-center">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Capture anything. Try: ship spec tomorrow 3pm #work !!"
        className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-subtle-foreground"
        aria-label="Quick add task"
        disabled={pending}
        autoComplete="off"
        spellCheck={false}
      />
    </form>
  );
}
