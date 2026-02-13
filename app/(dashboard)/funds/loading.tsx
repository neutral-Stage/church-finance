import { SkeletonList } from "@/components/ui/skeleton-loader";

/**
 * Funds page loading state
 */
export default function FundsLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 bg-white/20 rounded w-32 animate-pulse"></div>
        <div className="h-10 bg-white/20 rounded w-40 animate-pulse"></div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-6 animate-pulse"
          >
            <div className="h-5 bg-white/20 rounded w-24 mb-3"></div>
            <div className="h-10 bg-white/20 rounded w-36 mb-2"></div>
            <div className="h-3 bg-white/20 rounded w-28"></div>
          </div>
        ))}
      </div>

      {/* Funds list */}
      <SkeletonList />
    </div>
  );
}
