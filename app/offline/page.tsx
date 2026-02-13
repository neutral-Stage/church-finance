"use client";

import Link from "next/link";
import { Home, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-green-400/20 to-blue-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-white/10 backdrop-blur-xl rounded-full border border-white/20">
            <WifiOff className="w-16 h-16 text-white/80" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-white mb-4">
          You&apos;re Offline
        </h1>

        <p className="text-white/70 mb-8 text-lg">
          It looks like you&apos;ve lost your internet connection. Don&apos;t
          worry, your data is safe.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            asChild
            className="glass-button hover:scale-105 transition-all duration-300"
          >
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Return to Dashboard
            </Link>
          </Button>

          <Button
            variant="outline"
            className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>

        <p className="text-white/40 text-sm mt-8">
          Once you&apos;re back online, your data will sync automatically.
        </p>
      </div>
    </div>
  );
}
