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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      advances: {
        Row: {
          advance_date: string
          amount: number
          amount_returned: number | null
          approved_by: string
          church_id: string
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
          church_id: string
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
          church_id?: string
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
            foreignKeyName: "advances_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
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
      ai_conversations: {
        Row: {
          church_id: string
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          church_id: string
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          church_id?: string
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          allocation_percentage: number | null
          amount: number
          approval_status: string | null
          category: string | null
          church_id: string
          created_at: string | null
          due_date: string
          frequency: string
          fund_id: string
          id: string
          ledger_entry_id: string | null
          ledger_subgroup_id: string | null
          notes: string | null
          priority: string | null
          responsible_parties: string[] | null
          status: string | null
          vendor_name: string
        }
        Insert: {
          allocation_percentage?: number | null
          amount: number
          approval_status?: string | null
          category?: string | null
          church_id: string
          created_at?: string | null
          due_date: string
          frequency: string
          fund_id: string
          id?: string
          ledger_entry_id?: string | null
          ledger_subgroup_id?: string | null
          notes?: string | null
          priority?: string | null
          responsible_parties?: string[] | null
          status?: string | null
          vendor_name: string
        }
        Update: {
          allocation_percentage?: number | null
          amount?: number
          approval_status?: string | null
          category?: string | null
          church_id?: string
          created_at?: string | null
          due_date?: string
          frequency?: string
          fund_id?: string
          id?: string
          ledger_entry_id?: string | null
          ledger_subgroup_id?: string | null
          notes?: string | null
          priority?: string | null
          responsible_parties?: string[] | null
          status?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
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
          breakdown_date: string
          church_id: string
          coins: number | null
          created_at: string | null
          denomination_1: number | null
          denomination_10: number | null
          denomination_100: number | null
          denomination_1000: number | null
          denomination_2: number | null
          denomination_20: number | null
          denomination_200: number | null
          denomination_5: number | null
          denomination_50: number | null
          denomination_500: number | null
          fund_type: string | null
          id: string
          notes: string | null
          total_amount: number
        }
        Insert: {
          breakdown_date: string
          church_id: string
          coins?: number | null
          created_at?: string | null
          denomination_1?: number | null
          denomination_10?: number | null
          denomination_100?: number | null
          denomination_1000?: number | null
          denomination_2?: number | null
          denomination_20?: number | null
          denomination_200?: number | null
          denomination_5?: number | null
          denomination_50?: number | null
          denomination_500?: number | null
          fund_type?: string | null
          id?: string
          notes?: string | null
          total_amount: number
        }
        Update: {
          breakdown_date?: string
          church_id?: string
          coins?: number | null
          created_at?: string | null
          denomination_1?: number | null
          denomination_10?: number | null
          denomination_100?: number | null
          denomination_1000?: number | null
          denomination_2?: number | null
          denomination_20?: number | null
          denomination_200?: number | null
          denomination_5?: number | null
          denomination_50?: number | null
          denomination_500?: number | null
          fund_type?: string | null
          id?: string
          notes?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "cash_breakdown_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
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
          category: string | null
          church_id: string
          created_at: string | null
          description: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_confidential: boolean | null
          is_primary: boolean | null
          mime_type: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          church_id: string
          created_at?: string | null
          description?: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_confidential?: boolean | null
          is_primary?: boolean | null
          mime_type?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          church_id?: string
          created_at?: string | null
          description?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_confidential?: boolean | null
          is_primary?: boolean | null
          mime_type?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_attachments_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      document_embeddings: {
        Row: {
          church_id: string
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          source_id: string | null
          source_table: string | null
          updated_at: string | null
        }
        Insert: {
          church_id: string
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source_id?: string | null
          source_table?: string | null
          updated_at?: string | null
        }
        Update: {
          church_id?: string
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source_id?: string | null
          source_table?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_embeddings_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      funds: {
        Row: {
          church_id: string
          created_at: string | null
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
          church_id: string
          created_at?: string | null
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
          church_id?: string
          created_at?: string | null
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
        ]
      }
      ledger_entries: {
        Row: {
          church_id: string
          created_at: string | null
          default_due_date: string | null
          description: string | null
          entry_type: string
          id: string
          is_active: boolean | null
          priority: string | null
          responsible_parties: string[] | null
          sort_order: number | null
          status: string | null
          title: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          church_id: string
          created_at?: string | null
          default_due_date?: string | null
          description?: string | null
          entry_type: string
          id?: string
          is_active?: boolean | null
          priority?: string | null
          responsible_parties?: string[] | null
          sort_order?: number | null
          status?: string | null
          title: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          church_id?: string
          created_at?: string | null
          default_due_date?: string | null
          description?: string | null
          entry_type?: string
          id?: string
          is_active?: boolean | null
          priority?: string | null
          responsible_parties?: string[] | null
          sort_order?: number | null
          status?: string | null
          title?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_subgroups: {
        Row: {
          allocation_percentage: number | null
          created_at: string | null
          default_due_date: string | null
          description: string | null
          id: string
          ledger_entry_id: string
          priority: string | null
          sort_order: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          allocation_percentage?: number | null
          created_at?: string | null
          default_due_date?: string | null
          description?: string | null
          id?: string
          ledger_entry_id: string
          priority?: string | null
          sort_order?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          allocation_percentage?: number | null
          created_at?: string | null
          default_due_date?: string | null
          description?: string | null
          id?: string
          ledger_entry_id?: string
          priority?: string | null
          sort_order?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
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
          address: string | null
          church_id: string
          created_at: string | null
          email: string | null
          fellowship_name: string | null
          id: string
          is_active: boolean | null
          membership_date: string | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          church_id: string
          created_at?: string | null
          email?: string | null
          fellowship_name?: string | null
          id?: string
          is_active?: boolean | null
          membership_date?: string | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          church_id?: string
          created_at?: string | null
          email?: string | null
          fellowship_name?: string | null
          id?: string
          is_active?: boolean | null
          membership_date?: string | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          category: string | null
          church_id: string
          created_at: string | null
          id: string
          link: string | null
          message: string
          read: boolean | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          church_id: string
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          read?: boolean | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          church_id?: string
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      offering_member: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          member_id: string
          offering_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          member_id: string
          offering_id: string
        }
        Update: {
          amount?: number
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
            isOneToOne: false
            referencedRelation: "offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      offerings: {
        Row: {
          amount: number
          church_id: string
          contributors_count: number | null
          created_at: string | null
          fund_allocations: Json
          id: string
          notes: string | null
          service_date: string
          type: string
        }
        Insert: {
          amount: number
          church_id: string
          contributors_count?: number | null
          created_at?: string | null
          fund_allocations: Json
          id?: string
          notes?: string | null
          service_date: string
          type: string
        }
        Update: {
          amount?: number
          church_id?: string
          contributors_count?: number | null
          created_at?: string | null
          fund_allocations?: Json
          id?: string
          notes?: string | null
          service_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "offerings_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash: {
        Row: {
          amount: number
          approved_by: string
          church_id: string
          created_at: string | null
          id: string
          purpose: string
          receipt_available: boolean | null
          transaction_date: string
        }
        Insert: {
          amount: number
          approved_by: string
          church_id: string
          created_at?: string | null
          id?: string
          purpose: string
          receipt_available?: boolean | null
          transaction_date: string
        }
        Update: {
          amount?: number
          approved_by?: string
          church_id?: string
          created_at?: string | null
          id?: string
          purpose?: string
          receipt_available?: boolean | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
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
          church_id: string
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
          church_id: string
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
          church_id?: string
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
            foreignKeyName: "transactions_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
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
          created_at: string | null
          id: string
          notifications_enabled: boolean | null
          selected_church_id: string | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notifications_enabled?: boolean | null
          selected_church_id?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notifications_enabled?: boolean | null
          selected_church_id?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_selected_church_id_fkey"
            columns: ["selected_church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      fund_summary: {
        Row: {
          church_id: string | null
          current_balance: number | null
          fund_type: string | null
          id: string | null
          name: string | null
          total_expenses: number | null
          total_income: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funds_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      generate_advance_notifications: { Args: never; Returns: undefined }
      generate_bill_due_notifications: { Args: never; Returns: undefined }
      generate_offering_notifications: { Args: never; Returns: undefined }
      generate_transaction_notifications: { Args: never; Returns: undefined }
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
      search_similar_documents: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_church_id: string
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      user_has_church_access: {
        Args: { p_church_id: string }
        Returns: boolean
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
