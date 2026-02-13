import { SkeletonTable } from "@/components/ui/skeleton-loader";

/**
 * Admin panel loading state
 */
export default function AdminLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="mb-6">
        <div className="h-8 bg-white/20 rounded w-56 mb-2 animate-pulse"></div>
        <div className="h-4 bg-white/20 rounded w-72 animate-pulse"></div>
      </div>

      {/* Tabs/navigation */}
      <div className="flex gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-10 bg-white/20 rounded w-32 animate-pulse"
          ></div>
        ))}
      </div>

      {/* Admin content */}
      <SkeletonTable />
    </div>
  );
}
