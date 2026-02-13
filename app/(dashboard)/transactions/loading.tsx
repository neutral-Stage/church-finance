import { SkeletonTable } from "@/components/ui/skeleton-loader";

/**
 * Transactions page loading state
 */
export default function TransactionsLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 bg-white/20 rounded w-48 animate-pulse"></div>
        <div className="h-10 bg-white/20 rounded w-32 animate-pulse"></div>
      </div>

      {/* Filters */}
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-10 bg-white/20 rounded animate-pulse"
            ></div>
          ))}
        </div>
      </div>

      {/* Table */}
      <SkeletonTable />
    </div>
  );
}
