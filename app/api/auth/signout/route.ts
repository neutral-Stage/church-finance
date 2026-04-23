import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase-server";

// Cookies are always dynamic
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Invalidate the Supabase session as well — otherwise `supabase.auth.getUser()`
    // on the server still returns the user after sign-out and server components
    // remain authenticated.
    try {
      const supabase = await createServerClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Signout: supabase.auth.signOut() failed (continuing):", err);
    }

    // Build response AFTER signOut so the Supabase cookie adapter has time to
    // queue its expiry cookies.
    const response = NextResponse.json({ success: true });

    // Clear our minimal auth cookie
    response.cookies.set("church-auth-minimal", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    // Also clear the selected-church cookie to force a clean slate for the
    // next login.
    response.cookies.set("selectedChurch", "", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    // Best-effort: clear any lingering Supabase SSR cookies. The adapter in
    // lib/supabase-server writes cookies named `sb-<project>-auth-token` and
    // `sb-<project>-auth-token-code-verifier`.
    const cookieStore = cookies();
    for (const c of cookieStore.getAll()) {
      if (c.name.startsWith("sb-") && c.name.includes("auth-token")) {
        response.cookies.set(c.name, "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 0,
        });
      }
    }

    return response;
  } catch (error) {
    console.error("Signout route error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
