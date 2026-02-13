import { SkeletonStats } from "@/components/ui/skeleton-loader";

/**
 * Dashboard loading state
 * Shows while the dashboard is being loaded
 */
export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page header skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-white/20 rounded w-48 mb-2 animate-pulse"></div>
        <div className="h-4 bg-white/20 rounded w-64 animate-pulse"></div>
      </div>

      {/* Stats cards */}
      <SkeletonStats />

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-6 h-80 animate-pulse"
          >
            <div className="h-6 bg-white/20 rounded w-32 mb-4"></div>
            <div className="h-full bg-white/10 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
