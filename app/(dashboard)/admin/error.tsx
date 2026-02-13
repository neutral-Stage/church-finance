"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

/**
 * Admin panel error boundary
 * Catches errors within admin routes
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Admin panel error:", error);
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
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          {/* Error content */}
          <h2 className="text-xl font-bold text-white text-center mb-2">
            Admin Panel Error
          </h2>
          <p className="text-white/70 text-center mb-6">
            Unable to load this admin page. This could be due to insufficient
            permissions or a system error.
          </p>

          {/* Error details (development only) */}
          {process.env.NODE_ENV === "development" && (
            <div className="mb-6 p-4 bg-black/30 border border-white/10 rounded-lg max-h-40 overflow-auto">
              <p className="text-red-400 text-xs font-mono break-words whitespace-pre-wrap">
                {error.message}
              </p>
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
