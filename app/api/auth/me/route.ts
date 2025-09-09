import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    let authenticatedUser = null;

    // Check for minimal auth cookie
    const authCookie = request.cookies.get('church-auth-minimal');
    if (authCookie?.value) {
      try {
        const authData = JSON.parse(authCookie.value);
        
        // Check if token is still valid
        if (authData.expires_at && authData.expires_at > Math.floor(Date.now() / 1000)) {
          authenticatedUser = {
            id: authData.user_id,
            email: authData.email
          };
        }
      } catch (error) {
        console.error('Error parsing minimal auth cookie:', error);
      }
    }

    if (authenticatedUser) {
      // Fetch user role from database using the server client
      let userWithRole = null;
      try {
        const supabase = await createServerClient();
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", authenticatedUser.id);

        if (userError) {
          console.error("Database error fetching user role:", userError.message);
          return NextResponse.json(
            { user: null, error: "Failed to fetch user data" },
            { status: 500 }
          );
        }

        if (!userData || userData.length === 0) {
          console.error(`No user record found in database for ID ${authenticatedUser.id}`);
          return NextResponse.json(
            { user: null, error: "User profile not found" },
            { status: 404 }
          );
        }

        // Check for multiple user records (data integrity issue)
        if (userData.length > 1) {
          console.error(`Critical: Multiple user records found for ID ${authenticatedUser.id}. Count: ${userData.length}`);
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
          role: user.role,
          full_name: user.full_name,
          phone: user.phone,
          address: user.address,
          bio: user.bio,
          avatar_url: user.avatar_url,
          created_at: user.created_at,
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
    } else {
      return NextResponse.json({ user: null });
    }
  } catch (error) {
    console.error("Auth me route error:", error);
    return NextResponse.json(
      { user: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}
