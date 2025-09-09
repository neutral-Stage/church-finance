import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Standard client-side Supabase client
export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false, // We'll handle refresh manually
      persistSession: false, // We'll use server-side cookies instead
      detectSessionInUrl: false, // Disable to prevent conflicts
    },
  }
);

// Server-side client for API routes
export function createSupabaseServerClient(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookies = request.cookies.getAll();
        return cookies;
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: options?.maxAge || 7 * 24 * 60 * 60, // 7 days default
          });
        });
      },
    },
  });
}

// Server-side client for middleware
export function createSupabaseMiddlewareClient(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookies = request.cookies.getAll();
        return cookies;
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: options?.maxAge || 7 * 24 * 60 * 60, // 7 days default
          });
        });
      },
    },
  });

  return { supabase, response };
}

// Helper function to create a simple authentication cookie
export function createAuthCookie(
  user: unknown,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
) {
  const authData = {
    user,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
  };

  return {
    name: "church-auth",
    value: encodeURIComponent(JSON.stringify(authData)),
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: expiresIn,
    },
  };
}

// Helper function to read authentication cookie
export function readAuthCookie(request: NextRequest) {
  const authCookie = request.cookies.get("church-auth");
  if (!authCookie?.value) {
    return null;
  }

  try {
    const authData = JSON.parse(decodeURIComponent(authCookie.value));

    // Check if token is still valid
    if (
      authData.expires_at &&
      authData.expires_at > Math.floor(Date.now() / 1000)
    ) {
      return authData;
    }

    return null;
  } catch (error) {
    console.error("Error parsing auth cookie:", error);
    return null;
  }
}

// Helper function to clear authentication cookie
export function clearAuthCookie(response: NextResponse) {
  response.cookies.set("church-auth", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
