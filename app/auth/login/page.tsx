"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Church, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { FullScreenLoader } from "@/components/ui/loader";
import Link from "next/link";
import { login, signup } from "./actions";

export default function LoginPage(): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { signIn, user } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to dashboard (for when they directly visit login while already logged in)
  useEffect(() => {
    if (user && !loading) {
      console.log(
        "Already authenticated user detected, redirecting to dashboard..."
      );
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await signIn(email, password);

      if (error) {
        setError(
          typeof error === "string" ? error : "An error occurred during sign in"
        );
        setLoading(false);
      } else {
        router.replace("/dashboard");
      }
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  if (loading) {
    return <FullScreenLoader message="Signing you in..." />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 relative overflow-hidden">
      {/* Enhanced animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "4s" }}
        ></div>
        <div
          className="absolute top-20 right-20 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-20 left-20 w-40 h-40 bg-white/5 rounded-full blur-2xl animate-pulse"
          style={{ animationDelay: "3s" }}
        ></div>
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700">
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-[1.02] shadow-2xl animate-scale-in">
          <CardHeader
            className="text-center pb-8 animate-fade-in animate-slide-in-from-top-4 animate-duration-700"
            style={{ animationDelay: "200ms" }}
          >
            <div className="flex justify-center mb-6">
              <div
                className="relative animate-fade-in animate-slide-in-from-top-4 animate-duration-700"
                style={{ animationDelay: "400ms" }}
              >
                <div className="absolute inset-0 bg-white/20 rounded-full blur-xl"></div>
                <div className="relative bg-white/10 p-4 rounded-full backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all duration-300">
                  <Church className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
            <CardTitle
              className="text-4xl font-bold mb-2 text-responsive-2xl bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent animate-fade-in animate-slide-in-from-top-4 animate-duration-700"
              style={{ animationDelay: "600ms" }}
            >
              Church Finance
            </CardTitle>
            <CardDescription
              className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent text-md animate-fade-in animate-slide-in-from-top-4 animate-duration-700"
              style={{ animationDelay: "800ms" }}
            >
              Welcome back! Please sign in to your account
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div
                  className="space-y-2 animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700"
                  style={{ animationDelay: "1000ms" }}
                >
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-white/90"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/20 backdrop-blur-sm h-12 hover:bg-white/15 transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                <div
                  className="space-y-2 animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700"
                  style={{ animationDelay: "1200ms" }}
                >
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-white/90"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/20 backdrop-blur-sm h-12 hover:bg-white/15 transition-all duration-300"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white/80 transition-colors duration-300"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <Alert
                  variant="destructive"
                  className="bg-red-500/20 border-red-500/30 text-white animate-fade-in animate-slide-in-from-bottom-4 animate-duration-500"
                >
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-white/20 to-white/30 hover:from-white/30 hover:to-white/40 text-white/80 border border-white/30 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg font-semibold text-lg animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700"
                style={{ animationDelay: "1400ms" }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing you in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div
              className="text-center animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700"
              style={{ animationDelay: "1600ms" }}
            >
              <p className="text-white/80 text-responsive-sm">
                Don&apos;t have an account?{" "}
                <Link
                  href="/auth/signup"
                  className="text-white font-semibold hover:text-white/80 transition-colors duration-300 underline decoration-white/50 hover:decoration-white/80"
                >
                  Create Account
                </Link>
              </p>
            </div>

            <div
              className="mt-8 p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700"
              style={{ animationDelay: "1800ms" }}
            >
              <p className="text-sm font-semibold mb-4 text-center bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                Demo Accounts
              </p>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300">
                  <div>
                    <p className="text-sm font-medium text-white">
                      Administrator
                    </p>
                    <p className="text-xs text-white/70">
                      Full access to all features
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/80">admin@church.com</p>
                    <p className="text-xs text-white/60">admin123</p>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300">
                  <div>
                    <p className="text-sm font-medium text-white">Treasurer</p>
                    <p className="text-xs text-white/70">
                      Financial management
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/80">
                      treasurer@church.com
                    </p>
                    <p className="text-xs text-white/60">treasurer123</p>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300">
                  <div>
                    <p className="text-sm font-medium text-white">Viewer</p>
                    <p className="text-xs text-white/70">Read-only access</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/80">viewer@church.com</p>
                    <p className="text-xs text-white/60">viewer123</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
