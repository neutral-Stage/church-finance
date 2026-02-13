"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Root error boundary for the application
 * Catches all unhandled errors at the app level
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="relative max-w-md w-full mx-4">
        {/* Glass-morphic error card */}
        <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">
          {/* Error icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          {/* Error message */}
          <h1 className="text-2xl font-bold text-white text-center mb-2">
            Something went wrong!
          </h1>
          <p className="text-white/70 text-center mb-6">
            An unexpected error occurred. Please try again.
          </p>

          {/* Error details (in development only) */}
          {process.env.NODE_ENV === "development" && (
            <div className="mb-6 p-4 bg-black/30 border border-white/10 rounded-lg">
              <p className="text-red-400 text-sm font-mono break-words">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-white/50 text-xs mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={reset}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold"
            >
              Try Again
            </Button>
            <Button
              onClick={() => (window.location.href = "/")}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              Go to Home
            </Button>
          </div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full -z-10">
          <div className="absolute top-10 left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
      </div>
    </div>
  );
}
