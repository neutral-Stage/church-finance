import { Database } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServices, type ApiResult } from './type-safe-api';

// Enhanced Supabase helpers that provide better error handling and type safety
// This replaces the existing supabase-helpers.ts with a more robust architecture

export class EnhancedSupabaseClient {
  private client: SupabaseClient<Database>;
  private services: ReturnType<typeof createServices>;

  constructor(client: SupabaseClient<Database>) {
    this.client = client;
    this.services = createServices(client);
  }

  // ===== DIRECT TABLE ACCESS =====
  // These methods provide direct access to tables with proper error handling

  async safeQuery<T>(
    queryFn: (client: SupabaseClient<Database>) => Promise<{ data: T | null; error: any }>
  ): Promise<ApiResult<T>> {
    try {
      const { data, error } = await queryFn(this.client);

      if (error) {
        console.error('Supabase query error:', error);
        return {
          data: null,
          error: this.formatError(error),
          success: false
        };
      }

      return {
        data,
        error: null,
        success: true
      };
    } catch (err) {
      console.error('Unexpected query error:', err);
      return {
        data: null,
        error: 'An unexpected error occurred',
        success: false
      };
    }
  }

  // ===== SPECIFIC TABLE METHODS =====
  // Type-safe methods for common operations

  async getFunds(options?: { church_id?: string }): Promise<ApiResult<Database['public']['Tables']['funds']['Row'][]>> {
    return this.services.funds.getFunds(options?.church_id);
  }

  async getFundSummaries(options?: { church_id?: string }): Promise<ApiResult<Database['public']['Views']['fund_summary']['Row'][]>> {
    return this.services.funds.getFundSummaries(options?.church_id);
  }

  async createFund(data: Database['public']['Tables']['funds']['Insert']): Promise<ApiResult<Database['public']['Tables']['funds']['Row']>> {
    return this.services.funds.createFund(data);
  }

  async getTransactions(options?: {
    fund_id?: string;
    church_id?: string;
    type?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<ApiResult<Database['public']['Tables']['transactions']['Row'][]>> {
    return this.services.transactions.getTransactions(options);
  }

  async createTransaction(data: Database['public']['Tables']['transactions']['Insert']): Promise<ApiResult<Database['public']['Tables']['transactions']['Row']>> {
    return this.services.transactions.createTransaction(data);
  }

  async getBills(options?: {
    church_id?: string;
    status?: string;
    category?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResult<Database['public']['Tables']['bills']['Row'][]>> {
    return this.services.bills.getBills(options);
  }

  async createBill(data: Database['public']['Tables']['bills']['Insert']): Promise<ApiResult<Database['public']['Tables']['bills']['Row']>> {
    return this.services.bills.createBill(data);
  }

  // ===== GENERIC TABLE OPERATIONS =====
  // Generic methods that work with any table

  async selectFrom<T extends keyof Database['public']['Tables']>(
    table: T,
    options?: {
      columns?: string;
      filters?: Record<string, any>;
      orderBy?: { column: string; ascending?: boolean };
      limit?: number;
    }
  ): Promise<ApiResult<Database['public']['Tables'][T]['Row'][]>> {
    return this.safeQuery(async (client) => {
      let query = client.from(table).select(options?.columns || '*');

      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      if (options?.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true
        });
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      return query;
    }) as unknown as Promise<ApiResult<Database['public']['Tables'][T]['Row'][]>>;
  }

  async selectSingleFrom<T extends keyof Database['public']['Tables']>(
    table: T,
    filters: Record<string, any>,
    columns?: string
  ): Promise<ApiResult<Database['public']['Tables'][T]['Row']>> {
    return this.safeQuery(async (client) => {
      let query = client.from(table).select(columns || '*');

      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      return query.single();
    });
  }

  async insertInto<T extends keyof Database['public']['Tables']>(
    table: T,
    data: Database['public']['Tables'][T]['Insert'] | Database['public']['Tables'][T]['Insert'][]
  ): Promise<ApiResult<Database['public']['Tables'][T]['Row'][]>> {
    return this.safeQuery(async (client) => {
      return (client.from(table) as any).insert(data).select();
    });
  }

  async updateIn<T extends keyof Database['public']['Tables']>(
    table: T,
    data: Database['public']['Tables'][T]['Update'],
    filters: Record<string, any>
  ): Promise<ApiResult<Database['public']['Tables'][T]['Row'][]>> {
    return this.safeQuery(async (client) => {
      let query = (client.from(table) as any).update(data);

      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      return query.select();
    });
  }

  async deleteFrom<T extends keyof Database['public']['Tables']>(
    table: T,
    filters: Record<string, any>
  ): Promise<ApiResult<Database['public']['Tables'][T]['Row'][]>> {
    return this.safeQuery(async (client) => {
      let query = client.from(table).delete();

      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      return query.select();
    });
  }

  // ===== RPC FUNCTIONS =====
  // Type-safe RPC function calls

  async callFunction<T = any>(
    functionName: string,
    args?: Record<string, any>
  ): Promise<ApiResult<T>> {
    return this.safeQuery(async (client) => {
      return (client as any).rpc(functionName, args);
    }) as Promise<ApiResult<T>>;
  }

  // ===== UTILITY METHODS =====

  private formatError(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.details) return error.details;
    if (error?.hint) return error.hint;
    return 'An unknown database error occurred';
  }

  // Authentication helpers
  async getCurrentUser(): Promise<ApiResult<{ id: string; email?: string }>> {
    return this.safeQuery(async (client) => {
      const { data: { user }, error } = await client.auth.getUser();
      return { data: user, error };
    });
  }

  async getUserChurches(userId?: string): Promise<ApiResult<any[]>> {
    const userIdToUse = userId || (await this.getCurrentUser()).data?.id;
    if (!userIdToUse) {
      return {
        data: null,
        error: 'User not authenticated',
        success: false
      };
    }

    return this.callFunction('get_user_churches', { p_user_id: userIdToUse });
  }

  async checkUserPermission(
    churchId: string,
    resource: string,
    action: string,
    userId?: string
  ): Promise<ApiResult<boolean>> {
    const userIdToUse = userId || (await this.getCurrentUser()).data?.id;
    if (!userIdToUse) {
      return {
        data: false,
        error: 'User not authenticated',
        success: false
      };
    }

    return this.callFunction('check_user_permission', {
      p_user_id: userIdToUse,
      p_church_id: churchId,
      p_resource: resource,
      p_action: action
    });
  }

  // Batch operations
  async batchInsert<T extends keyof Database['public']['Tables']>(
    table: T,
    items: Database['public']['Tables'][T]['Insert'][],
    batchSize: number = 100
  ): Promise<ApiResult<Database['public']['Tables'][T]['Row'][]>> {
    const results: Database['public']['Tables'][T]['Row'][] = [];
    const errors: string[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const result = await this.insertInto(table, batch);

      if (result.success && result.data) {
        results.push(...result.data);
      } else {
        errors.push(result.error || 'Unknown error in batch');
      }
    }

    if (errors.length > 0) {
      return {
        data: null,
        error: `Batch insert failed: ${errors.join(', ')}`,
        success: false
      };
    }

    return {
      data: results,
      error: null,
      success: true
    };
  }

  // Relationship helpers
  async getFundWithTransactions(
    fundId: string,
    limit?: number
  ): Promise<ApiResult<any>> {
    return this.safeQuery(async (client) => {
      return client
        .from('funds')
        .select(`
          *,
          transactions(*)
        `)
        .eq('id', fundId)
        .limit(limit || 50, { referencedTable: 'transactions' })
        .single();
    });
  }

  async getBillWithDetails(billId: string): Promise<ApiResult<any>> {
    return this.safeQuery(async (client) => {
      return client
        .from('bills')
        .select(`
          *,
          funds(*),
          ledger_entries(*),
          ledger_subgroups(*)
        `)
        .eq('id', billId)
        .single();
    });
  }
}

// Factory function to create enhanced client
export function createEnhancedClient(client: SupabaseClient<Database>) {
  return new EnhancedSupabaseClient(client);
}

// Hook for use in components
export function useEnhancedSupabase(client: SupabaseClient<Database>) {
  return createEnhancedClient(client);
}

// Legacy compatibility - these functions wrap the new architecture
// This allows existing code to continue working while migration happens

export function assertDatabaseRow<T extends keyof Database['public']['Tables']>(
  data: any,
  tableName: T
): Database['public']['Tables'][T]['Row'] {
  console.warn('assertDatabaseRow is deprecated. Use EnhancedSupabaseClient methods instead.');
  return data as Database['public']['Tables'][T]['Row'];
}

export function assertDatabaseRows<T extends keyof Database['public']['Tables']>(
  data: any[],
  tableName: T
): Database['public']['Tables'][T]['Row'][] {
  console.warn('assertDatabaseRows is deprecated. Use EnhancedSupabaseClient methods instead.');
  return data as Database['public']['Tables'][T]['Row'][];
}

export async function typedQuery<T>(queryPromise: Promise<any>): Promise<ApiResult<T>> {
  console.warn('typedQuery is deprecated. Use EnhancedSupabaseClient.safeQuery instead.');
  try {
    const result = await queryPromise;
    return {
      data: result.data as T,
      error: result.error?.message || null,
      success: !result.error
    };
  } catch (error) {
    return {
      data: null,
      error: 'Query failed',
      success: false
    };
  }
}

// Export enhanced client as default
export default EnhancedSupabaseClient;