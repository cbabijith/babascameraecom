export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-7">
      <div className="h-28 rounded-2xl bg-slate-200/70" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-36 rounded-2xl bg-slate-200/70" />
        ))}
      </div>
      <div className="h-96 rounded-2xl bg-slate-200/70" />
    </div>
  );
}
