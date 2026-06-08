import { login } from './actions';

export const metadata = { title: 'Sign in · Ops Dashboard' };

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
  const next =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\')
      ? rawNext
      : '/today';

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center p-6">
      <div className="surface w-full max-w-sm p-6">
        <div className="mb-5">
          <div className="dot-grid mb-3 size-9 rounded-lg border" aria-hidden />
          <h1 className="text-lg font-semibold">Ops Dashboard</h1>
          <p className="text-xs text-muted-foreground">Sign in to sync across your devices.</p>
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
              className="input"
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
              className="input"
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
            className="mt-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            Sign in
          </button>
        </form>

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          This is a single-user dashboard. Accounts are created in the Supabase
          dashboard — there is no public signup.
        </p>
      </div>
    </div>
  );
}
