"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

/**
 * Dashboard error boundary
 * Catches errors within the dashboard route group
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="relative max-w-lg w-full">
        {/* Glass-morphic error card */}
        <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">
          {/* Error icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          {/* Error content */}
          <h2 className="text-xl font-bold text-white text-center mb-2">
            Dashboard Error
          </h2>
          <p className="text-white/70 text-center mb-6">
            Unable to load this dashboard page. Please try again.
          </p>

          {/* Error details (development only) */}
          {process.env.NODE_ENV === "development" && (
            <div className="mb-6 p-4 bg-black/30 border border-white/10 rounded-lg max-h-40 overflow-auto">
              <p className="text-red-400 text-xs font-mono break-words whitespace-pre-wrap">
                {error.message}
              </p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-white/50 text-xs cursor-pointer">
                    Stack trace
                  </summary>
                  <pre className="text-white/40 text-xs mt-2 overflow-x-auto">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={reset}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              Try Again
            </Button>
            <Button
              onClick={() => router.push("/dashboard")}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
