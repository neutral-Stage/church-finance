import { SkeletonList } from "@/components/ui/skeleton-loader";

/**
 * Members page loading state
 */
export default function MembersLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 bg-white/20 rounded w-40 animate-pulse"></div>
        <div className="h-10 bg-white/20 rounded w-36 animate-pulse"></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-4 animate-pulse"
          >
            <div className="h-4 bg-white/20 rounded w-24 mb-2"></div>
            <div className="h-7 bg-white/20 rounded w-16"></div>
          </div>
        ))}
      </div>

      {/* Search & filters */}
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 bg-white/20 rounded animate-pulse"
            ></div>
          ))}
        </div>
      </div>

      {/* Members list */}
      <SkeletonList />
    </div>
  );
}
