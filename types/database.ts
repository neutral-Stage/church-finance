export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      advances: {
        Row: {
          advance_date: string
          amount: number
          amount_returned: number | null
          approved_by: string
          created_at: string | null
          expected_return_date: string
          fund_id: string
          id: string
          notes: string | null
          payment_method: string
          purpose: string
          recipient_name: string
          status: string | null
        }
        Insert: {
          advance_date: string
          amount: number
          amount_returned?: number | null
          approved_by: string
          created_at?: string | null
          expected_return_date: string
          fund_id: string
          id?: string
          notes?: string | null
          payment_method: string
          purpose: string
          recipient_name: string
          status?: string | null
        }
        Update: {
          advance_date?: string
          amount?: number
          amount_returned?: number | null
          approved_by?: string
          created_at?: string | null
          expected_return_date?: string
          fund_id?: string
          id?: string
          notes?: string | null
          payment_method?: string
          purpose?: string
          recipient_name?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advances_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advances_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          allocation_percentage: number | null
          amount: number
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string | null
          document_name: string | null
          document_size: number | null
          document_type: string | null
          document_uploaded_at: string | null
          document_url: string | null
          due_date: string
          frequency: string
          fund_id: string
          id: string
          ledger_entry_id: string | null
          ledger_subgroup_id: string | null
          metadata: Json | null
          notes: string | null
          priority: string | null
          responsible_parties: string[] | null
          sort_order: number | null
          status: string | null
          updated_at: string | null
          vendor_name: string
        }
        Insert: {
          allocation_percentage?: number | null
          amount: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string | null
          document_name?: string | null
          document_size?: number | null
          document_type?: string | null
          document_uploaded_at?: string | null
          document_url?: string | null
          due_date: string
          frequency: string
          fund_id: string
          id?: string
          ledger_entry_id?: string | null
          ledger_subgroup_id?: string | null
          metadata?: Json | null
          notes?: string | null
          priority?: string | null
          responsible_parties?: string[] | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
          vendor_name: string
        }
        Update: {
          allocation_percentage?: number | null
          amount?: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string | null
          document_name?: string | null
          document_size?: number | null
          document_type?: string | null
          document_uploaded_at?: string | null
          document_url?: string | null
          due_date?: string
          frequency?: string
          fund_id?: string
          id?: string
          ledger_entry_id?: string | null
          ledger_subgroup_id?: string | null
          metadata?: Json | null
          notes?: string | null
          priority?: string | null
          responsible_parties?: string[] | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_ledger_entry_id_fkey"
            columns: ["ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_ledger_subgroup_id_fkey"
            columns: ["ledger_subgroup_id"]
            isOneToOne: false
            referencedRelation: "ledger_subgroups"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_breakdown: {
        Row: {
          count: number
          created_at: string | null
          denomination: number
          fund_type: string
          id: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          count?: number
          created_at?: string | null
          denomination: number
          fund_type: string
          id?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          count?: number
          created_at?: string | null
          denomination?: number
          fund_type?: string
          id?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      churches: {
        Row: {
          address: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          email: string | null
          established_date: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          settings: Json | null
          type: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email?: string | null
          established_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          settings?: Json | null
          type?: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email?: string | null
          established_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          settings?: Json | null
          type?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      document_attachments: {
        Row: {
          bill_id: string | null
          category: string | null
          created_at: string | null
          description: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          is_confidential: boolean | null
          is_primary: boolean | null
          ledger_entry_id: string | null
          ledger_subgroup_id: string | null
          mime_type: string
          parent_document_id: string | null
          storage_bucket: string
          storage_path: string
          tags: string[] | null
          title: string | null
          updated_at: string | null
          uploaded_by: string
          version: number | null
        }
        Insert: {
          bill_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          is_confidential?: boolean | null
          is_primary?: boolean | null
          ledger_entry_id?: string | null
          ledger_subgroup_id?: string | null
          mime_type: string
          parent_document_id?: string | null
          storage_bucket?: string
          storage_path: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          uploaded_by: string
          version?: number | null
        }
        Update: {
          bill_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          is_confidential?: boolean | null
          is_primary?: boolean | null
          ledger_entry_id?: string | null
          ledger_subgroup_id?: string | null
          mime_type?: string
          parent_document_id?: string | null
          storage_bucket?: string
          storage_path?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_attachments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_attachments_ledger_entry_id_fkey"
            columns: ["ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_attachments_ledger_subgroup_id_fkey"
            columns: ["ledger_subgroup_id"]
            isOneToOne: false
            referencedRelation: "ledger_subgroups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_attachments_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "document_attachments"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_metadata: {
        Row: {
          created_at: string | null
          created_by: string | null
          custom_name: string
          fund_id: string
          fund_type: string | null
          id: string
          target_amount: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          custom_name: string
          fund_id: string
          fund_type?: string | null
          id?: string
          target_amount?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          custom_name?: string
          fund_id?: string
          fund_type?: string | null
          id?: string
          target_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fund_metadata_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "fund_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_metadata_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
        ]
      }
      funds: {
        Row: {
          church_id: string | null
          created_at: string | null
          created_by: string | null
          current_balance: number | null
          description: string | null
          fund_type: string | null
          id: string
          is_active: boolean | null
          name: string
          target_amount: number | null
          updated_at: string | null
        }
        Insert: {
          church_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_balance?: number | null
          description?: string | null
          fund_type?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          target_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          church_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_balance?: number | null
          description?: string | null
          fund_type?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          target_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funds_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funds_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "user_permissions_summary"
            referencedColumns: ["church_id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          default_due_date: string | null
          default_fund_id: string | null
          description: string | null
          id: string
          metadata: Json | null
          notes: string | null
          priority: string | null
          responsible_parties: string[] | null
          status: string | null
          title: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          default_due_date?: string | null
          default_fund_id?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          priority?: string | null
          responsible_parties?: string[] | null
          status?: string | null
          title: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          default_due_date?: string | null
          default_fund_id?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          priority?: string | null
          responsible_parties?: string[] | null
          status?: string | null
          title?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_default_fund_id_fkey"
            columns: ["default_fund_id"]
            isOneToOne: false
            referencedRelation: "fund_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_default_fund_id_fkey"
            columns: ["default_fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_subgroups: {
        Row: {
          allocation_percentage: number | null
          created_at: string | null
          created_by: string | null
          default_due_date: string | null
          default_fund_id: string | null
          description: string | null
          id: string
          ledger_entry_id: string
          metadata: Json | null
          notes: string | null
          priority: string | null
          purpose: string | null
          responsible_parties: string[] | null
          sort_order: number | null
          status: string | null
          title: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          allocation_percentage?: number | null
          created_at?: string | null
          created_by?: string | null
          default_due_date?: string | null
          default_fund_id?: string | null
          description?: string | null
          id?: string
          ledger_entry_id: string
          metadata?: Json | null
          notes?: string | null
          priority?: string | null
          purpose?: string | null
          responsible_parties?: string[] | null
          sort_order?: number | null
          status?: string | null
          title: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          allocation_percentage?: number | null
          created_at?: string | null
          created_by?: string | null
          default_due_date?: string | null
          default_fund_id?: string | null
          description?: string | null
          id?: string
          ledger_entry_id?: string
          metadata?: Json | null
          notes?: string | null
          priority?: string | null
          purpose?: string | null
          responsible_parties?: string[] | null
          sort_order?: number | null
          status?: string | null
          title?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_subgroups_default_fund_id_fkey"
            columns: ["default_fund_id"]
            isOneToOne: false
            referencedRelation: "fund_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_subgroups_default_fund_id_fkey"
            columns: ["default_fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_subgroups_ledger_entry_id_fkey"
            columns: ["ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "ledger_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string | null
          fellowship_name: string | null
          id: string
          job: string | null
          location: string | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fellowship_name?: string | null
          id?: string
          job?: string | null
          location?: string | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fellowship_name?: string | null
          id?: string
          job?: string | null
          location?: string | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          category: string
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          category: string
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          category?: string
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      offering_member: {
        Row: {
          created_at: string | null
          id: string
          member_id: string
          offering_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          member_id: string
          offering_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          member_id?: string
          offering_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offering_member_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offering_member_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: true
            referencedRelation: "offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      offerings: {
        Row: {
          amount: number
          created_at: string | null
          fund_allocations: Json
          id: string
          notes: string | null
          service_date: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          fund_allocations: Json
          id?: string
          notes?: string | null
          service_date: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          fund_allocations?: Json
          id?: string
          notes?: string | null
          service_date?: string
          type?: string
        }
        Relationships: []
      }
      petty_cash: {
        Row: {
          amount: number
          approved_by: string
          created_at: string | null
          id: string
          purpose: string
          receipt_available: boolean | null
          transaction_date: string
        }
        Insert: {
          amount: number
          approved_by: string
          created_at?: string | null
          id?: string
          purpose: string
          receipt_available?: boolean | null
          transaction_date: string
        }
        Update: {
          amount?: number
          approved_by?: string
          created_at?: string | null
          id?: string
          purpose?: string
          receipt_available?: boolean | null
          transaction_date?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          is_system_role: boolean | null
          name: string
          permissions: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          name: string
          permissions?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          name?: string
          permissions?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          description: string
          fund_id: string
          id: string
          payment_method: string
          receipt_number: string | null
          transaction_date: string
          type: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          created_by?: string | null
          description: string
          fund_id: string
          id?: string
          payment_method: string
          receipt_number?: string | null
          transaction_date: string
          type: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          fund_id?: string
          id?: string
          payment_method?: string
          receipt_number?: string | null
          transaction_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
        ]
      }
      user_church_roles: {
        Row: {
          church_id: string | null
          created_at: string | null
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          role_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          church_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          role_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          church_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          role_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_church_roles_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_church_roles_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "user_permissions_summary"
            referencedColumns: ["church_id"]
          },
          {
            foreignKeyName: "user_church_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      fund_summary: {
        Row: {
          church_id: string | null
          created_at: string | null
          current_balance: number | null
          fund_type: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          total_expenses: number | null
          total_income: number | null
          total_offerings: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funds_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funds_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "user_permissions_summary"
            referencedColumns: ["church_id"]
          },
        ]
      }
      user_permissions_summary: {
        Row: {
          church_id: string | null
          church_name: string | null
          church_type: string | null
          email: string | null
          expires_at: string | null
          full_name: string | null
          granted_at: string | null
          is_active: boolean | null
          permissions: Json | null
          role_display_name: string | null
          role_name: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_user_permission: {
        Args: {
          p_action: string
          p_church_id: string
          p_resource: string
          p_user_id: string
        }
        Returns: boolean
      }
      cleanup_orphaned_bill_documents: {
        Args: Record<PropertyKey, never>
        Returns: {
          bill_count: number
          document_url: string
        }[]
      }
      generate_advance_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_bill_due_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_offering_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_transaction_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_bill_hierarchy_path: {
        Args: { bill_id: string }
        Returns: {
          bill_vendor: string
          ledger_entry_title: string
          ledger_subgroup_title: string
        }[]
      }
      get_document_summary: {
        Args: { entity_id: string; entity_type: string }
        Returns: {
          categories: string[]
          primary_document_id: string
          primary_document_name: string
          total_documents: number
        }[]
      }
      get_user_churches: {
        Args: { p_user_id: string }
        Returns: {
          church_id: string
          church_name: string
          church_type: string
          permissions: Json
          role_display_name: string
          role_name: string
        }[]
      }
      update_fund_balance: {
        Args: { amount_change: number; fund_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// Custom types used throughout the application
export type AuthUser = Database["public"]["Tables"]["users"]["Row"] & {
  role?: string
}

export type UserRole = "super_admin" | "church_admin" | "treasurer" | "member" | "viewer" | "admin"

export type Fund = Database["public"]["Tables"]["funds"]["Row"]

export type FundSummary = Fund & {
  current_balance: number
  transaction_count: number
  total_income?: number
  total_expenses?: number
  total_offerings?: number
}

export type TransactionWithFund = Database["public"]["Tables"]["transactions"]["Row"] & {
  fund?: Fund
  funds?: Fund
}

export type BillWithFund = Database["public"]["Tables"]["bills"]["Row"] & {
  funds?: Fund
}

export type AdvanceWithFund = Database["public"]["Tables"]["advances"]["Row"] & {
  funds?: Fund
}

export type Bill = Database["public"]["Tables"]["bills"]["Row"]

export type LedgerEntry = Database["public"]["Tables"]["ledger_entries"]["Row"]

export type LedgerSubgroup = Database["public"]["Tables"]["ledger_subgroups"]["Row"]

export type ChurchWithRole = Database["public"]["Tables"]["churches"]["Row"] & {
  user_church_roles?: Database["public"]["Tables"]["user_church_roles"]["Row"][]
  role?: Database["public"]["Tables"]["roles"]["Row"]
  user_church_role?: Database["public"]["Tables"]["user_church_roles"]["Row"]
}

export type CashBreakdownData = Database["public"]["Tables"]["cash_breakdown"]["Row"]

export type OfferingWithCount = Database["public"]["Tables"]["offerings"]["Row"] & {
  contributors_count?: number
}
