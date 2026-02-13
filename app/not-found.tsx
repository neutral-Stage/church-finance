import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Custom 404 Not Found page
 * Displays when a route doesn't exist
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="relative max-w-xl w-full">
        {/* Glass-morphic 404 card */}
        <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8 md:p-12 text-center">
          {/* 404 illustration */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/20 mb-6">
              <svg
                className="w-16 h-16 text-white/80"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-7xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-indigo-400 mb-4">
              404
            </h1>
          </div>

          {/* Error message */}
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Page Not Found
          </h2>
          <p className="text-white/70 text-lg mb-8 max-w-md mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved to a different location.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold px-8"
              >
                Go to Dashboard
              </Button>
            </Link>
            <Link href="/">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10 px-8"
              >
                Go Home
              </Button>
            </Link>
          </div>

          {/* Help text */}
          <p className="text-white/50 text-sm mt-8">
            If you believe this is an error, please contact support.
          </p>
        </div>

        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden">
          <div className="absolute -top-10 -left-10 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-500" />
        </div>
      </div>
    </div>
  );
}
