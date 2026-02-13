"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

/**
 * Transactions page error boundary
 * Catches errors specific to transactions
 */
export default function TransactionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Transactions error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="relative max-w-md w-full">
        {/* Glass-morphic error card */}
        <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-6">
          {/* Error icon */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          {/* Error content */}
          <h2 className="text-lg font-bold text-white text-center mb-2">
            Transaction Error
          </h2>
          <p className="text-white/70 text-sm text-center mb-5">
            Unable to load transactions. Please try again or contact support if
            the issue persists.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={reset}
              size="sm"
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              Try Again
            </Button>
            <Button
              onClick={() => router.push("/dashboard")}
              size="sm"
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
