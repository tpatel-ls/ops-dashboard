'use client';

import { useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, KeyRound } from 'lucide-react';
import { cn } from '@ops-dashboard/ui';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  loading?: boolean;
  error?: boolean;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  noKey?: boolean;
}

export function ChatPanel({
  messages,
  input,
  onInputChange,
  onSubmit,
  loading,
  noKey,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && input.trim()) onSubmit();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="surface flex h-[min(680px,calc(100dvh-10rem))] min-h-[420px] flex-col overflow-hidden">
      {/* Message list */}
      <div className="scrollbar-thin flex-1 overflow-y-auto p-3 sm:p-4 md:p-6" role="log" aria-live="polite">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary-soft">
              <Bot className="size-5 text-primary" aria-hidden />
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-subtle-foreground">
              Ask anything
            </div>
            <h3 className="text-base font-semibold">Project intelligence</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Ask about organizations, project status, deadlines, and open tasks.
            </p>
            <div className="grid w-full max-w-sm gap-2 sm:grid-cols-2">
              {['What is overdue?', 'What should I do next?', 'Summarize LSG work'].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    onInputChange(prompt);
                    textareaRef.current?.focus();
                  }}
                  className="min-h-10 rounded-md border bg-card px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
            {noKey && (
              <div className="mt-2 flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
                <KeyRound className="size-4 shrink-0" aria-hidden />
                <span>
                  Add <code className="kbd">ANTHROPIC_API_KEY</code> to{' '}
                  <code className="kbd">.env.local</code> to chat with your data.
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-3',
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary-soft text-primary',
                  )}
                >
                  {msg.role === 'user' ? (
                    <User className="size-3.5" aria-hidden />
                  ) : (
                    <Bot className="size-3.5" aria-hidden />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={cn(
                    'max-w-[88%] rounded-lg px-3 py-2.5 text-sm leading-relaxed sm:max-w-[78%] sm:px-4 sm:py-3',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'surface-flat text-foreground',
                    msg.error && 'border-destructive/30 text-destructive',
                  )}
                >
                  {msg.loading ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      Thinking…
                    </span>
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.text}</span>
                  )}
                </div>
              </div>
            ))}

            {/* Inline no-key notice when it surfaces after a send */}
            {noKey && messages.length > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
                <KeyRound className="size-4 shrink-0" aria-hidden />
                <span>
                  Add <code className="kbd">ANTHROPIC_API_KEY</code> to{' '}
                  <code className="kbd">.env.local</code> to chat with your data.
                </span>
              </div>
            )}
            <div ref={bottomRef} aria-hidden />
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="hairline border-t" />

      {/* Input row */}
      <div className="flex items-end gap-2 p-3 md:p-4">
        <textarea
          ref={textareaRef}
          className="input min-h-[40px] flex-1 resize-none leading-relaxed"
          rows={1}
          placeholder="Ask about your work"
          value={input}
          onChange={(e) => {
            onInputChange(e.target.value);
            // Auto-grow
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={handleKeyDown}
          disabled={loading}
          aria-label="Chat input"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || !input.trim()}
          aria-label="Send message"
          className={cn(
            'inline-flex size-11 shrink-0 items-center justify-center rounded-md transition-colors',
            loading || !input.trim()
              ? 'cursor-not-allowed bg-muted text-muted-foreground'
              : 'bg-primary text-primary-foreground hover:opacity-90',
          )}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Send className="size-4" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
