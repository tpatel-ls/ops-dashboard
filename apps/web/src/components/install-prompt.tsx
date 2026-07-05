'use client';

import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '@/lib/use-install-prompt';

const DISMISS_KEY = 'ops:install-prompt-dismissed';

function getDismissedState(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return true;
  }
}

export function InstallPrompt() {
  const { canPrompt, prompt } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(getDismissedState);

  if (!canPrompt || dismissed) return null;

  return (
    <div className="fixed right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-50 max-w-[320px] rounded-[16px] border bg-card p-3 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.65)] md:bottom-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-primary/10 text-primary">
          <Download className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold tracking-tight">Install Identity OS</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Pin the app for faster capture, shortcuts, and PWA features.
          </p>
          <button
            type="button"
            onClick={() => void prompt()}
            className="mt-2 inline-flex h-8 items-center rounded-[9px] bg-primary px-3 text-xs font-medium text-primary-foreground"
          >
            Install app
          </button>
        </div>
        <button
          type="button"
          aria-label="Dismiss install prompt"
          onClick={() => {
            window.localStorage.setItem(DISMISS_KEY, '1');
            setDismissed(true);
          }}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
