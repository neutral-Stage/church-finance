import React from "react";
import { cn } from "@/lib/utils";

/**
 * Skeleton loader component for loading states
 * Uses glass-morphism design consistent with app theme
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-6 animate-pulse",
        className,
      )}
    >
      <div className="space-y-3">
        <div className="h-4 bg-white/20 rounded w-3/4"></div>
        <div className="h-4 bg-white/20 rounded w-1/2"></div>
        <div className="h-4 bg-white/20 rounded w-5/6"></div>
      </div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/10 p-4 flex gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-4 bg-white/20 rounded flex-1 animate-pulse"
          ></div>
        ))}
      </div>

      {/* Rows */}
      {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
        <div key={row} className="border-b border-white/10 p-4 flex gap-4">
          {[1, 2, 3, 4, 5].map((col) => (
            <div
              key={col}
              className="h-4 bg-white/20 rounded flex-1 animate-pulse"
              style={{ animationDelay: `${row * 50 + col * 10}ms` }}
            ></div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-6 animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-white/20 rounded w-24"></div>
            <div className="h-10 w-10 bg-white/20 rounded-full"></div>
          </div>
          <div className="h-8 bg-white/20 rounded w-32 mb-2"></div>
          <div className="h-3 bg-white/20 rounded w-20"></div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-4 animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-white/20 rounded-full flex-shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/20 rounded w-3/4"></div>
              <div className="h-3 bg-white/20 rounded w-1/2"></div>
            </div>
            <div className="h-8 w-20 bg-white/20 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
