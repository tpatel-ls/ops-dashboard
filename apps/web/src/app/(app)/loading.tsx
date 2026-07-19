export default function AppLoading() {
  return (
    <div
      role="status"
      aria-label="Loading view"
      className="mx-auto flex h-full w-full max-w-[1360px] flex-col gap-4 p-3 sm:p-4 md:gap-5 md:p-6"
    >
      <span className="sr-only">Loading</span>
      <div className="os-panel h-32 animate-pulse rounded-xl p-5" aria-hidden>
        <div className="h-3 w-24 rounded bg-bg-sunken" />
        <div className="mt-4 h-8 w-48 max-w-full rounded bg-bg-sunken" />
        <div className="mt-3 h-3 w-80 max-w-full rounded bg-bg-sunken" />
      </div>
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2" aria-hidden>
        <div className="surface animate-pulse p-4">
          <div className="h-4 w-32 rounded bg-bg-sunken" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-14 rounded-md bg-bg-sunken" />
            ))}
          </div>
        </div>
        <div className="surface animate-pulse p-4">
          <div className="h-4 w-28 rounded bg-bg-sunken" />
          <div className="mt-5 h-52 rounded-md bg-bg-sunken" />
        </div>
      </div>
    </div>
  );
}
