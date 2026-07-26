export default function AppLoading() {
  return (
    <div
      role="status"
      aria-label="Loading view"
      aria-busy="true"
      className="mx-auto flex h-full w-full max-w-[1360px] flex-col gap-4 p-3 sm:p-4 md:p-6"
    >
      <span className="sr-only">Loading</span>
      <div className="border-border/70 animate-pulse border-b py-2 pb-4" aria-hidden>
        <div className="bg-bg-sunken h-3 w-16 rounded" />
        <div className="bg-bg-sunken mt-2 h-7 w-36 max-w-full rounded" />
        <div className="bg-bg-sunken mt-2 h-3 w-56 max-w-full rounded" />
      </div>
      <div className="mx-auto w-full max-w-4xl" aria-hidden>
        <div className="surface overflow-hidden">
          <div className="hairline flex items-center justify-between border-b px-4 py-3">
            <div className="bg-bg-sunken h-4 w-24 animate-pulse rounded" />
            <div className="bg-bg-sunken h-5 w-8 animate-pulse rounded-full" />
          </div>
          <div className="divide-border/70 divide-y">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex min-h-16 animate-pulse items-center gap-3 px-4"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <span className="border-border-strong size-[18px] rounded-full border" />
                <span className="min-w-0 flex-1">
                  <span className="bg-bg-sunken block h-3.5 w-3/5 rounded" />
                  <span className="bg-bg-sunken mt-2 block h-2.5 w-2/5 rounded" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
