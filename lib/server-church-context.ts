import { createServerClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import { cache } from "react";
import type { ChurchWithRole } from "@/types/database";

/**
 * Server-side church context utilities for managing church selection in server components
 */

// Cache for the duration of the request
export const getSelectedChurch = cache(async (): Promise<ChurchWithRole | null> => {
  try {
    // 1. Try to get selected church from cookies first
    const cookieStore = await cookies();
    const selectedChurchCookie = cookieStore.get('selectedChurch');

    // console.log('[ServerChurchContext] getSelectedChurch - Cookie exists:', !!selectedChurchCookie);

    if (selectedChurchCookie) {
      try {
        const churchData = JSON.parse(selectedChurchCookie.value);
        // Validate that this is a proper church object
        if (churchData && churchData.id && churchData.name) {
          // console.log('[ServerChurchContext] ✓ Returning valid church from cookie:', churchData.name);
          return churchData as ChurchWithRole;
        }
      } catch (error) {
        console.error('[ServerChurchContext] ✗ Failed to parse selectedChurch cookie:', error);
      }
    }

    // 2. Fallback: Check database for user preference
    // console.log('[ServerChurchContext] Cookie missing or invalid, checking database preferences...');

    // Get all available churches first (we need the full object with roles)
    const availableChurches = await getAvailableChurches();

    if (availableChurches.length === 0) {
      console.log('[ServerChurchContext] No available churches found for user');
      return null;
    }

    // Get current user to check preferences
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Fetch user preference
    const { data: pref } = await supabase
      .from('user_preferences')
      .select('selected_church_id')
      .eq('user_id', user.id)
      .single();

    let selectedChurch: ChurchWithRole | undefined;

    if (pref?.selected_church_id) {
      // Find the preferred church in the available list
      selectedChurch = availableChurches.find(c => c.id === pref.selected_church_id);
      if (selectedChurch) {
        console.log('[ServerChurchContext] ✓ Found preferred church in DB:', selectedChurch.name);
      }
    }

    // 3. Fallback: Default to first available church if no preference or preference not found
    if (!selectedChurch) {
      selectedChurch = availableChurches[0];
      console.log('[ServerChurchContext] ✓ Defaulting to first available church:', selectedChurch.name);
    }

    return selectedChurch || null;

  } catch (error) {
    console.error('[ServerChurchContext] Error getting selected church:', error);
    return null;
  }
});



// Get all available churches for the current user
export const getAvailableChurches = cache(async (): Promise<ChurchWithRole[]> => {
  try {
    const supabase = await createServerClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return [];
    }

    // Get user's churches through the RPC function
    const { data: churches, error: churchesError } = await supabase
      .rpc('get_user_churches', { p_user_id: user.id });

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