import { Database } from '@/types/database';

type Tables = Database['public']['Tables'];
type TableName = keyof Tables;

// Type-safe helper functions to handle RLS policy issues with TypeScript inference

export class SupabaseQueryBuilder<T extends TableName> {
  constructor(
    private supabase: any, // Use any to avoid type conflicts with different Supabase client configurations
    private tableName: T
  ) {}

  // Safe select with proper typing
  async select<K extends keyof Tables[T]['Row']>(
    columns: K[] | '*' = '*' as any
  ): Promise<{
    data: Tables[T]['Row'][] | null;
    error: any;
  }> {
    const query = this.supabase.from(this.tableName);
    const result = await (query as any).select(columns === '*' ? '*' : columns.join(','));
    return result as {
      data: Tables[T]['Row'][] | null;
      error: any;
    };
  }

  // Safe insert with proper typing
  async insert(
    values: Tables[T]['Insert'] | Tables[T]['Insert'][]
  ): Promise<{
    data: Tables[T]['Row'][] | null;
    error: any;
  }> {
    const query = this.supabase.from(this.tableName);
    const result = await (query as any).insert(values).select();
    return result as {
      data: Tables[T]['Row'][] | null;
      error: any;
    };
  }

  // Safe update with proper typing
  async update(
    values: Tables[T]['Update'],
    filter: { column: keyof Tables[T]['Row']; value: any }
  ): Promise<{
    data: Tables[T]['Row'][] | null;
    error: any;
  }> {
    const query = this.supabase.from(this.tableName);
    const result = await (query as any)
      .update(values)
      .eq(filter.column, filter.value)
      .select();
    return result as {
      data: Tables[T]['Row'][] | null;
      error: any;
    };
  }

  // Safe delete with proper typing
  async delete(
    filter: { column: keyof Tables[T]['Row']; value: any }
  ): Promise<{
    data: Tables[T]['Row'][] | null;
    error: any;
  }> {
    const query = this.supabase.from(this.tableName);
    const result = await (query as any)
      .delete()
      .eq(filter.column, filter.value)
      .select();
    return result as {
      data: Tables[T]['Row'][] | null;
      error: any;
    };
  }

  // Safe single row fetch
  async selectSingle<K extends keyof Tables[T]['Row']>(
    filter: { column: keyof Tables[T]['Row']; value: any },
    columns: K[] | '*' = '*' as any
  ): Promise<{
    data: Tables[T]['Row'] | null;
    error: any;
  }> {
    const query = this.supabase.from(this.tableName);
    const result = await (query as any)
      .select(columns === '*' ? '*' : columns.join(','))
      .eq(filter.column, filter.value)
      .single();
    return result as {
      data: Tables[T]['Row'] | null;
      error: any;
    };
  }

  // Query builder with filters
  selectQuery(columns: string = '*') {
    const query = this.supabase.from(this.tableName);
    return new QueryBuilder(query as any, columns);
  }
}

export class QueryBuilder {
  constructor(
    private query: any,
    private columns: string
  ) {}

  select() {
    return this.query.select(this.columns);
  }

  eq(column: string, value: any) {
    this.query = this.query.eq(column, value);
    return this;
  }

  gte(column: string, value: any) {
    this.query = this.query.gte(column, value);
    return this;
  }

  lte(column: string, value: any) {
    this.query = this.query.lte(column, value);
    return this;
  }

  lt(column: string, value: any) {
    this.query = this.query.lt(column, value);
    return this;
  }

  ilike(column: string, value: any) {
    this.query = this.query.ilike(column, value);
    return this;
  }

  in(column: string, values: any[]) {
    this.query = this.query.in(column, values);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.query = this.query.order(column, options);
    return this;
  }

  limit(count: number) {
    this.query = this.query.limit(count);
    return this;
  }

  single() {
    this.query = this.query.single();
    return this;
  }

  async execute<T = any>(): Promise<{ data: T | null; error: any }> {
    return await this.query.select(this.columns);
  }
}

// Factory function to create type-safe query builders
export function createQueryBuilder<T extends TableName>(
  supabase: any,
  tableName: T
) {
  return new SupabaseQueryBuilder(supabase, tableName);
}

// Specific helper functions for common operations
export async function safeSelect<T extends TableName>(
  supabase: any,
  tableName: T,
  options?: {
    columns?: string;
    filter?: { column: string; value: any };
    order?: { column: string; ascending?: boolean };
    limit?: number;
  }
): Promise<{ data: Tables[T]['Row'][] | null; error: any }> {
  try {
    let query = (supabase.from(tableName) as any).select(options?.columns || '*');

    if (options?.filter) {
      query = query.eq(options.filter.column, options.filter.value);
    }

    if (options?.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const result = await query;
    return result as { data: Tables[T]['Row'][] | null; error: any };
  } catch (error) {
    return { data: null, error };
  }
}

export async function safeInsert<T extends TableName>(
  supabase: any,
  tableName: T,
  values: Tables[T]['Insert'] | Tables[T]['Insert'][]
): Promise<{ data: Tables[T]['Row'][] | null; error: any }> {
  try {
    const result = await (supabase.from(tableName) as any).insert(values).select();
    return result as { data: Tables[T]['Row'][] | null; error: any };
  } catch (error) {
    return { data: null, error };
  }
}

export async function safeUpdate<T extends TableName>(
  supabase: any,
  tableName: T,
  values: Tables[T]['Update'],
  filter: { column: string; value: any }
): Promise<{ data: Tables[T]['Row'][] | null; error: any }> {
  try {
    const result = await (supabase.from(tableName) as any)
      .update(values)
      .eq(filter.column, filter.value)
      .select();
    return result as { data: Tables[T]['Row'][] | null; error: any };
  } catch (error) {
    return { data: null, error };
  }
}

export async function safeDelete<T extends TableName>(
  supabase: any,
  tableName: T,
  filter: { column: string; value: any }
): Promise<{ data: Tables[T]['Row'][] | null; error: any }> {
  try {
    const result = await (supabase.from(tableName) as any)
      .delete()
      .eq(filter.column, filter.value)
      .select();
    return result as { data: Tables[T]['Row'][] | null; error: any };
  } catch (error) {
    return { data: null, error };
  }
}

// RPC function helper
export async function safeRpc<T = any>(
  supabase: any,
  functionName: string,
  args?: Record<string, any>
): Promise<{ data: T | null; error: any }> {
  try {
    const result = await (supabase.rpc as any)(functionName, args);
    return result as { data: T | null; error: any };
  } catch (error) {
    return { data: null, error };
  }
}