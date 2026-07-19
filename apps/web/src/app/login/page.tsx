import { login } from './actions';
import { safeNextPath } from '@/lib/auth-navigation';
import { Check, Grid2X2 } from 'lucide-react';

export const metadata = { title: 'Sign in · Taskify' };

const ERRORS: Record<string, string> = {
  invalid: 'Incorrect email or password.',
  'not-configured': 'Sync is not configured on this deployment yet.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next: rawNext } = await searchParams;
  const message = error ? (ERRORS[error] ?? 'Sign-in failed.') : null;
  const localDevLogin = process.env.NODE_ENV !== 'production';
  const next = safeNextPath(rawNext);

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-bg-sunken p-4 sm:p-6">
      <div className="surface w-full max-w-md p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3 border-b border-border/70 pb-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Grid2X2 className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Taskify</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your project workspace.</p>
          </div>
        </div>

        <form action={login} className="grid gap-3">
          <input type="hidden" name="next" value={next} />
          <label className="grid gap-1 text-xs text-muted-foreground">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              className="input min-h-11"
              placeholder="you@example.com"
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              className="input min-h-11"
              placeholder="••••••••"
            />
          </label>

          {message ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            className="mt-1 min-h-11 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Sign in
          </button>
        </form>

        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Check className="size-3.5 text-success" aria-hidden />
          Approved accounts sync across signed-in devices.
        </p>

        {localDevLogin ? (
          <div className="mt-4 border-t pt-4">
            <a
              href={`/auth/dev-login?next=${encodeURIComponent(next)}`}
              className="flex min-h-11 w-full items-center justify-center rounded-md border bg-bg-sunken px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Continue locally
            </a>
            <p className="mt-2 text-[11px] leading-relaxed text-subtle-foreground">
              Development only. This bypass never works on production hosts.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
