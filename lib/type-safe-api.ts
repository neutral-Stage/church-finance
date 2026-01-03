import { Database } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

// Type-safe API architecture for consistent error handling and type inference

export type ApiResult<T> = {
  data: T | null;
  error: string | null;
  success: boolean;
};

export type ApiError = {
  message: string;
  code?: string;
  details?: any;
};

// Base API service class with consistent error handling
export abstract class BaseApiService {
  protected supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  protected async handleQuery<T>(
    queryPromise: PromiseLike<any>
  ): Promise<ApiResult<T>> {
    try {
      const { data, error } = await queryPromise;

      if (error) {
        console.error('Database query error:', error);
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
      console.error('Unexpected error:', err);
      return {
        data: null,
        error: 'An unexpected error occurred',
        success: false
      };
    }
  }

  protected formatError(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.details) return error.details;
    return 'An unknown error occurred';
  }

  protected async requireAuth(): Promise<ApiResult<string>> {
    const { data: { user }, error } = await this.supabase.auth.getUser();

    if (error || !user) {
      return {
        data: null,
        error: 'Authentication required',
        success: false
      };
    }

    return {
      data: user.id,
      error: null,
      success: true
    };
  }

  protected async getUserChurchContext(userId: string): Promise<ApiResult<string>> {
    const { data, error } = await (this.supabase as any)
      .rpc('get_user_current_church', { p_user_id: userId });

    if (error || !data) {
      return {
        data: null,
        error: 'No church access found',
        success: false
      };
    }

    return {
      data,
      error: null,
      success: true
    };
  }
}

// Type-safe query builder that handles RLS properly
export class TypeSafeQueryBuilder<
  T extends keyof Database['public']['Tables'],
  Row = Database['public']['Tables'][T]['Row'],
  Insert = Database['public']['Tables'][T]['Insert'],
  Update = Database['public']['Tables'][T]['Update']
> extends BaseApiService {
  private tableName: T;

  constructor(supabase: SupabaseClient<Database>, tableName: T) {
    super(supabase);
    this.tableName = tableName;
  }

  async select(
    options?: {
      columns?: string;
      filter?: Record<string, any>;
      order?: { column: string; ascending?: boolean };
      limit?: number;
    }
  ): Promise<ApiResult<Row[]>> {
    let query = (this.supabase as any)
      .from(this.tableName)
      .select(options?.columns || '*');

    if (options?.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    if (options?.order) {
      query = query.order(options.order.column, {
        ascending: options.order.ascending ?? true
      });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return this.handleQuery<Row[]>(query);
  }

  async selectSingle(
    filter: Record<string, any>,
    columns?: string
  ): Promise<ApiResult<Row>> {
    let query = (this.supabase as any)
      .from(this.tableName)
      .select(columns || '*');

    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    return this.handleQuery(query.single());
  }

  async insert(values: Insert | Insert[]): Promise<ApiResult<Row[]>> {
    const query = (this.supabase as any)
      .from(this.tableName)
      .insert(values as any)
      .select();

    return this.handleQuery(query);
  }

  async update(
    values: Update,
    filter: Record<string, any>
  ): Promise<ApiResult<Row[]>> {
    let query = (this.supabase as any)
      .from(this.tableName)
      .update(values as any);

    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    return this.handleQuery(query.select());
  }

  async delete(filter: Record<string, any>): Promise<ApiResult<Row[]>> {
    let query = (this.supabase as any)
      .from(this.tableName)
      .delete();

    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    return this.handleQuery(query.select());
  }
}

// Specific service classes for each major entity
export class FundsService extends BaseApiService {
  async getFunds(churchId?: string): Promise<ApiResult<Database['public']['Tables']['funds']['Row'][]>> {
    const authResult = await this.requireAuth();
    if (!authResult.success) return authResult as ApiResult<any>;

    let query = this.supabase
      .from('funds')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (churchId) {
      query = query.eq('church_id', churchId);
    }

    return this.handleQuery(query);
  }

  async getFundSummaries(churchId?: string): Promise<ApiResult<Database['public']['Views']['fund_summary']['Row'][]>> {
    const authResult = await this.requireAuth();
    if (!authResult.success) return authResult as ApiResult<any>;

    let query = this.supabase
      .from('fund_summary')
      .select('*')
      .order('name');

    if (churchId) {
      query = query.eq('church_id', churchId);
    }

    return this.handleQuery(query);
  }

  async createFund(
    data: Database['public']['Tables']['funds']['Insert']
  ): Promise<ApiResult<Database['public']['Tables']['funds']['Row']>> {
    const authResult = await this.requireAuth();
    if (!authResult.success) return authResult as ApiResult<any>;

    // Get user's church context if not provided
    if (!(data as any).church_id) {
      const churchResult = await this.getUserChurchContext(authResult.data!);
      if (!churchResult.success) return churchResult as ApiResult<any>;
      data.church_id = churchResult.data!;
    }

    // created_by column doesn't exist on funds table

    const query = this.supabase
      .from('funds')
      .insert(data)
      .select()
      .single();

    return this.handleQuery(query);
  }
}

export class TransactionsService extends BaseApiService {
  async getTransactions(options?: {
    fundId?: string;
    churchId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<ApiResult<Database['public']['Tables']['transactions']['Row'][]>> {
    const authResult = await this.requireAuth();
    if (!authResult.success) return authResult as ApiResult<any>;

    let query = this.supabase
      .from('transactions')
      .select(`
        *,
        funds(name, church_id)
      `)
      .order('created_at', { ascending: false });

    if (options?.fundId) {
      query = query.eq('fund_id', options.fundId);
    }

    if (options?.churchId) {
      query = query.eq('church_id', options.churchId);
    }

    if (options?.type) {
      query = query.eq('type', options.type);
    }

    if (options?.startDate) {
      query = query.gte('transaction_date', options.startDate);
    }

    if (options?.endDate) {
      query = query.lte('transaction_date', options.endDate);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return this.handleQuery(query);
  }

  async createTransaction(
    data: Database['public']['Tables']['transactions']['Insert']
  ): Promise<ApiResult<Database['public']['Tables']['transactions']['Row']>> {
    const authResult = await this.requireAuth();
    if (!authResult.success) return authResult as ApiResult<any>;

    // Validate required fields
    if (!data.amount || data.amount <= 0) {
      return {
        data: null,
        error: 'Amount must be greater than 0',
        success: false
      };
    }

    if (!data.fund_id) {
      return {
        data: null,
        error: 'Fund ID is required',
        success: false
      };
    }

    if (!(data as any).church_id) {
      return {
        data: null,
        error: 'Church ID is required',
        success: false
      };
    }

    // Validate that the fund belongs to the specified church and user has access
    const fundResult = await this.supabase
      .from('funds')
      .select('church_id, current_balance')
      .eq('id', data.fund_id)
      .eq('church_id', (data as any).church_id)
      .single();

    if (fundResult.error || !fundResult.data) {
      return {
        data: null,
        error: 'Fund not found',
        success: false
      };
    }

    // Check sufficient balance for expenses
    if (data.type === 'expense' && fundResult.data.current_balance != null && fundResult.data.current_balance < data.amount) {
      return {
        data: null,
        error: 'Insufficient funds',
        success: false
      };
    }

    const insertData = {
      ...data,
      church_id: (data as any).church_id,
      created_by: authResult.data!
    } as any;

    const query = this.supabase
      .from('transactions')
      .insert(insertData)
      .select()
      .single();

    return this.handleQuery(query);
  }
}

export class BillsService extends BaseApiService {
  async getBills(options?: {
    churchId?: string;
    status?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResult<Database['public']['Tables']['bills']['Row'][]>> {
    const authResult = await this.requireAuth();
    if (!authResult.success) return authResult as ApiResult<any>;

    let query = this.supabase
      .from('bills')
      .select(`
        *,
        funds(name, church_id),
        ledger_entries(*),
        ledger_subgroups(*)
      `)
      .order('due_date', { ascending: true });

    if (options?.churchId) {
      query = query.eq('church_id', options.churchId);
    }

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.category) {
      query = query.eq('category', options.category);
    }

    if (options?.startDate) {
      query = query.gte('due_date', options.startDate);
    }

    if (options?.endDate) {
      query = query.lte('due_date', options.endDate);
    }

    return this.handleQuery(query);
  }

  async createBill(
    data: Database['public']['Tables']['bills']['Insert']
  ): Promise<ApiResult<Database['public']['Tables']['bills']['Row']>> {
    const authResult = await this.requireAuth();
    if (!authResult.success) return authResult as ApiResult<any>;

    // Validate required fields
    if (!data.vendor_name || !data.amount || !data.due_date) {
      return {
        data: null,
        error: 'Vendor name, amount, and due date are required',
        success: false
      };
    }

    // Validate association requirements
    if (!data.ledger_entry_id && !data.ledger_subgroup_id) {
      return {
        data: null,
        error: 'Bill must be associated with either a ledger entry or subgroup',
        success: false
      };
    }

    if (data.ledger_entry_id && data.ledger_subgroup_id) {
      return {
        data: null,
        error: 'Bill cannot be associated with both ledger entry and subgroup',
        success: false
      };
    }

    const insertData = data;

    const query = this.supabase
      .from('bills')
      .insert(insertData)
      .select()
      .single();

    return this.handleQuery(query);
  }
}

// Factory function to create service instances
export function createServices(supabase: SupabaseClient<Database>) {
  return {
    funds: new FundsService(supabase),
    transactions: new TransactionsService(supabase),
    bills: new BillsService(supabase),
    // Add more services as needed
  };
}

// Type-safe query builder factory
export function createQueryBuilder<T extends keyof Database['public']['Tables']>(
  supabase: SupabaseClient<Database>,
  tableName: T
) {
  return new TypeSafeQueryBuilder(supabase, tableName);
}