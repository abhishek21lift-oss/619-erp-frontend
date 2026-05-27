export default function ProfileLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Avatar skeleton */}
      <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white/[0.07]" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-36 bg-white/[0.07] rounded-lg" />
            <div className="h-3 w-24 bg-white/[0.04] rounded-lg" />
          </div>
        </div>
      </div>
      {/* Fields skeleton */}
      {[1,2,3].map(i => (
        <div key={i} className="bg-[#141414] border border-white/[0.07] rounded-2xl p-6 space-y-4">
          <div className="h-4 w-28 bg-white/[0.07] rounded-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1,2].map(j => (
              <div key={j} className="space-y-2">
                <div className="h-3 w-20 bg-white/[0.04] rounded" />
                <div className="h-10 bg-white/[0.04] rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
