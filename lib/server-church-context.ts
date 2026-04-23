import { createServerClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import { cache } from "react";
import type { ChurchWithRole } from "@/types/database";
import { isDemoMode } from "@/lib/demo/config";
import { DEMO_CHURCH_ID } from "@/lib/demo/constants";

/**
 * Server-side church context utilities for managing church selection in server components
 */

function getDemoChurch(): ChurchWithRole {
  const now = new Date().toISOString()
  return {
    id: DEMO_CHURCH_ID,
    name: "Grace Fellowship (Demo)",
    type: "Main",
    is_active: true,
    created_at: now,
    updated_at: now,
    created_by: null,
    address: "100 Demo Street",
    phone: "555-0100",
    email: "office@example.com",
    description: "Demonstration congregation",
    established_date: "1998-01-01",
    settings: null,
    website: "https://example.com",
    role_name: "treasurer",
    role_display_name: "Treasurer",
    role: {
      id: "00000000-0000-4000-8000-000000000201",
      name: "treasurer",
      display_name: "Treasurer",
      description: null,
      created_at: now,
    },
  } as ChurchWithRole
}

// Cache for the duration of the request
export const getSelectedChurch = cache(async (): Promise<ChurchWithRole | null> => {
  try {
    if (isDemoMode()) {
      return getDemoChurch()
    }

    // Try to get selected church from cookies first
    const cookieStore = await cookies();
    const selectedChurchCookie = cookieStore.get('selectedChurch');

    console.log('[ServerChurchContext] getSelectedChurch - Cookie exists:', !!selectedChurchCookie);

    if (selectedChurchCookie) {
      console.log('[ServerChurchContext] Cookie value (first 100 chars):', selectedChurchCookie.value.substring(0, 100));

      try {
        const churchData = JSON.parse(selectedChurchCookie.value);
        console.log('[ServerChurchContext] Parsed church data:', {
          id: churchData.id,
          name: churchData.name,
          type: churchData.type
        });

        // Validate that this is a proper church object
        if (churchData && churchData.id && churchData.name) {
          console.log('[ServerChurchContext] ✓ Returning valid church:', churchData.id, churchData.name);
          return churchData as ChurchWithRole;
        } else {
          console.warn('[ServerChurchContext] ✗ Invalid church data structure:', churchData);
        }
      } catch (error) {
        console.error('[ServerChurchContext] ✗ Failed to parse selectedChurch cookie:', error);
      }
    } else {
      console.log('[ServerChurchContext] ✗ No selectedChurch cookie found');
    }

    // No cookie found - return null to show empty state
    // The client-side context will auto-select and set the cookie
    console.log('[ServerChurchContext] Returning null - EmptyChurchState will be shown');
    return null;
  } catch (error) {
    console.error('[ServerChurchContext] Error getting selected church:', error);
    return null;
  }
});



// Get all available churches for the current user
export const getAvailableChurches = cache(async (): Promise<ChurchWithRole[]> => {
  try {
    if (isDemoMode()) {
      return [getDemoChurch()]
    }

    const supabase = await createServerClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return [];
    }

    // Get user's churches through the RPC function
    const { data: churches, error: churchesError } = await (supabase.rpc as any)('get_user_churches', { p_user_id: user.id });

    if (churchesError) {
      console.error('Error fetching user churches:', churchesError);
      return [];
    }

    return (churches || []).map((church: any) => ({
      id: church.church_id,
      name: church.church_name,
      type: church.church_type,
      permissions: church.permissions,
      role_name: church.role_name,
      role_display_name: church.role_display_name,
      // Other required church fields with defaults
      address: null,
      created_at: null,
      created_by: null,
      description: null,
      email: null,
      established_date: null,
      is_active: true,
      phone: null,
      settings: null,
      updated_at: null,
      website: null,
      user_church_roles: undefined,
      role: null,
      user_church_role: null
    })) as unknown as ChurchWithRole[];
  } catch (error) {
    console.error('Error getting available churches:', error);
    return [];
  }
});

// Ensure a church is selected - if not, redirect or throw error
export const requireChurch = async (): Promise<ChurchWithRole> => {
  const selectedChurch = await getSelectedChurch();

  if (!selectedChurch) {
    // Could redirect to a church selection page or throw an error
    throw new Error('No church selected. Please select a church to continue.');
  }

  return selectedChurch;
};

// Utility to filter query results by church_id
export const withChurchFilter = <T extends { church_id?: string }>(
  data: T[],
  churchId: string
): T[] => {
  return data.filter(item => item.church_id === churchId);
};

// Utility to add church_id to data objects
export const withChurchId = <T>(
  data: T,
  churchId: string
): T & { church_id: string } => {
  return { ...data, church_id: churchId };
};

// Church context for server components
export interface ServerChurchContext {
  selectedChurch: ChurchWithRole | null;
  availableChurches: ChurchWithRole[];
  hasChurchSelected: boolean;
  churchId: string | null;
}

export const getServerChurchContext = cache(async (): Promise<ServerChurchContext> => {
  const [selectedChurch, availableChurches] = await Promise.all([
    getSelectedChurch(),
    getAvailableChurches()
  ]);

  return {
    selectedChurch,
    availableChurches,
    hasChurchSelected: !!selectedChurch,
    churchId: selectedChurch?.id || null
  };
});