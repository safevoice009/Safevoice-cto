export default function PostSkeleton() {
  return (
    <div className="glass rounded-lg p-6 animate-pulse space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-4 w-24 bg-slate-700/70 rounded" />
        <div className="h-4 w-28 bg-slate-700/70 rounded" />
        <div className="h-4 w-20 bg-slate-700/70 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-slate-700/70 rounded" />
        <div className="h-4 bg-slate-700/70 rounded w-3/4" />
        <div className="h-4 bg-slate-700/70 rounded w-2/3" />
      </div>
      <div className="flex items-center gap-3">
        <div className="h-8 w-16 bg-slate-700/70 rounded-full" />
        <div className="h-8 w-16 bg-slate-700/70 rounded-full" />
        <div className="h-8 w-16 bg-slate-700/70 rounded-full" />
      </div>
    </div>
  );
}
