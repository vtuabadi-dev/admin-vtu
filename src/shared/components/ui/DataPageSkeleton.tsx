export function DataPageSkeleton({ label = "Memuat data..." }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-6">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-6 animate-pulse motion-reduce:animate-none">
        <div className="space-y-2">
          <div className="h-8 w-56 max-w-full rounded bg-slate-200" />
          <div className="h-4 w-80 max-w-full rounded bg-slate-100" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-28 rounded-xl border bg-white p-5 space-y-4">
              <div className="h-4 w-28 rounded bg-slate-100" />
              <div className="h-7 w-16 rounded bg-slate-200" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border bg-white p-5 space-y-5">
          <div className="h-9 w-full rounded bg-slate-100" />
          {[0, 1, 2, 3, 4].map((item) => <div key={item} className="h-10 w-full rounded bg-slate-100/70" />)}
        </div>
      </div>
    </div>
  );
}
