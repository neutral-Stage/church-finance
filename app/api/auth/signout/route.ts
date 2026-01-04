import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST() {
  try {
    // Sign out from Supabase (this clears the session cookies)
    const supabase = await createServerClient();
    await supabase.auth.signOut();

    // Create response object
    const response = NextResponse.json({ success: true });

    // Also clear our minimal auth cookie (if it exists)
    response.cookies.set("church-auth-minimal", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Signout route error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
