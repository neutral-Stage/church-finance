import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { safeSelect } from "@/lib/supabase-helpers";

// Force dynamic rendering since this route uses cookies
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Use Supabase's built-in session management
    const supabase = await createServerClient();
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !supabaseUser) {
      console.log('Auth me: No authenticated user found');
      return NextResponse.json({ user: null });
    }

    // Fetch user profile from database
    let userWithRole = null;
    try {
      const { data: userData, error: userError } = await safeSelect(supabase, "users", {
        filter: { column: "id", value: supabaseUser.id }
      });

      if (userError) {
        console.error("Database error fetching user role:", userError.message);
        return NextResponse.json(
          { user: null, error: "Failed to fetch user data" },
          { status: 500 }
        );
      }

      if (!userData || userData.length === 0) {
        console.error(`No user record found in database for ID ${supabaseUser.id}`);
        return NextResponse.json(
          { user: null, error: "User profile not found" },
          { status: 404 }
        );
      }

      // Check for multiple user records (data integrity issue)
      if (userData.length > 1) {
        console.error(`Critical: Multiple user records found for ID ${supabaseUser.id}. Count: ${userData.length}`);
        return NextResponse.json(
          { user: null, error: "Data integrity error: duplicate user records" },
          { status: 500 }
        );
      }

      // Single user record found - this is correct
      const user = userData[0];
      userWithRole = {
        id: user.id,
        email: user.email,
        role: user.role || 'viewer',
        full_name: user.full_name || '',
        phone: user.phone || '',
        address: user.address || '',
        bio: user.bio || '',
        avatar_url: user.avatar_url || '',
        created_at: user.created_at,
        updated_at: user.updated_at
      };

      console.log(`User data fetched successfully for ${user.email} with role: ${user.role}`);

    } catch (error) {
      console.error("Exception fetching user from database:", error);
      return NextResponse.json(
        { user: null, error: "Internal server error" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user: userWithRole,
    });

  } catch (error) {
    console.error("Auth me route error:", error);
    return NextResponse.json(
      { user: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}
