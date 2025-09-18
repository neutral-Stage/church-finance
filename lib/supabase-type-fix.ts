import { Database } from '@/types/database';

// Type assertion utilities to fix RLS "never" type issues
// This is a temporary workaround until RLS policies are properly configured

export function assertDatabaseRow<T extends keyof Database['public']['Tables']>(
  data: any,
  tableName: T
): Database['public']['Tables'][T]['Row'] {
  return data as Database['public']['Tables'][T]['Row'];
}

export function assertDatabaseRows<T extends keyof Database['public']['Tables']>(
  data: any[],
  tableName: T
): Database['public']['Tables'][T]['Row'][] {
  return data as Database['public']['Tables'][T]['Row'][];
}

export function assertInsertData<T extends keyof Database['public']['Tables']>(
  data: any,
  tableName: T
): Database['public']['Tables'][T]['Insert'] {
  return data as Database['public']['Tables'][T]['Insert'];
}

export function assertUpdateData<T extends keyof Database['public']['Tables']>(
  data: any,
  tableName: T
): Database['public']['Tables'][T]['Update'] {
  return data as Database['public']['Tables'][T]['Update'];
}

// Generic query result assertion
export function assertQueryResult<T>(data: any): T {
  return data as T;
}

// Safe property access for potentially "never" typed objects
export function safeProperty<T>(obj: any, property: string): T | undefined {
  try {
    return obj?.[property] as T;
  } catch {
    return undefined;
  }
}

// Type-safe Supabase query wrapper
export async function typedQuery<T>(queryPromise: Promise<any>): Promise<{
  data: T | null;
  error: any;
}> {
  try {
    const result = await queryPromise;
    return {
      data: result.data as T,
      error: result.error
    };
  } catch (error) {
    return {
      data: null,
      error
    };
  }
}

// Common table type assertions
export const TypeAssertions = {
  users: (data: any) => assertDatabaseRow(data, 'users'),
  usersArray: (data: any[]) => assertDatabaseRows(data, 'users'),

  advances: (data: any) => assertDatabaseRow(data, 'advances'),
  advancesArray: (data: any[]) => assertDatabaseRows(data, 'advances'),

  transactions: (data: any) => assertDatabaseRow(data, 'transactions'),
  transactionsArray: (data: any[]) => assertDatabaseRows(data, 'transactions'),

  bills: (data: any) => assertDatabaseRow(data, 'bills'),
  billsArray: (data: any[]) => assertDatabaseRows(data, 'bills'),

  funds: (data: any) => assertDatabaseRow(data, 'funds'),
  fundsArray: (data: any[]) => assertDatabaseRows(data, 'funds'),

  churches: (data: any) => assertDatabaseRow(data, 'churches'),
  churchesArray: (data: any[]) => assertDatabaseRows(data, 'churches'),

  roles: (data: any) => assertDatabaseRow(data, 'roles'),
  rolesArray: (data: any[]) => assertDatabaseRows(data, 'roles'),

  userChurchRoles: (data: any) => assertDatabaseRow(data, 'user_church_roles'),
  userChurchRolesArray: (data: any[]) => assertDatabaseRows(data, 'user_church_roles'),
};

// Quick property extractors for common operations
export function extractProperty<T = any>(obj: any, prop: string, defaultValue?: T): T {
  return (obj as any)?.[prop] ?? defaultValue;
}

export function extractId(obj: any): string {
  return extractProperty(obj, 'id', '');
}

export function extractAmount(obj: any): number {
  return extractProperty(obj, 'amount', 0);
}

export function extractStatus(obj: any): string {
  return extractProperty(obj, 'status', '');
}