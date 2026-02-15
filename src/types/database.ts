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
      api_keys: {
        Row: {
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          scopes: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          scopes?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          scopes?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          organization_id: string | null
          target_user_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          target_user_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          target_user_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_codes: {
        Row: {
          archived_at: string | null
          code_hash: string
          created_at: string | null
          created_by: string | null
          id: string
          updated_at: string | null
          used: boolean | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          code_hash: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          updated_at?: string | null
          used?: boolean | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          code_hash?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          updated_at?: string | null
          used?: boolean | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          archived_at: string | null
          attendees: Json | null
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          email_account_id: string
          end_time: string
          id: string
          is_online_meeting: boolean | null
          location: string | null
          meeting_provider: string | null
          meeting_url: string | null
          organizer_email: string | null
          provider_calendar_id: string | null
          provider_event_id: string
          recurrence: Json | null
          reminders: Json | null
          rsvp_status: Database["public"]["Enums"]["event_rsvp"] | null
          start_time: string
          status: string | null
          synced_at: string | null
          timezone: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          archived_at?: string | null
          attendees?: Json | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email_account_id: string
          end_time: string
          id?: string
          is_online_meeting?: boolean | null
          location?: string | null
          meeting_provider?: string | null
          meeting_url?: string | null
          organizer_email?: string | null
          provider_calendar_id?: string | null
          provider_event_id: string
          recurrence?: Json | null
          reminders?: Json | null
          rsvp_status?: Database["public"]["Enums"]["event_rsvp"] | null
          start_time: string
          status?: string | null
          synced_at?: string | null
          timezone?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          all_day?: boolean | null
          archived_at?: string | null
          attendees?: Json | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email_account_id?: string
          end_time?: string
          id?: string
          is_online_meeting?: boolean | null
          location?: string | null
          meeting_provider?: string | null
          meeting_url?: string | null
          organizer_email?: string | null
          provider_calendar_id?: string | null
          provider_event_id?: string
          recurrence?: Json | null
          reminders?: Json | null
          rsvp_status?: Database["public"]["Enums"]["event_rsvp"] | null
          start_time?: string
          status?: string | null
          synced_at?: string | null
          timezone?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_metadata: {
        Row: {
          archived_at: string | null
          calendar_name: string
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          email_account_id: string
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          last_synced_at: string | null
          provider_calendar_id: string
          read_only: boolean | null
          sync_cursor: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          calendar_name: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email_account_id: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_synced_at?: string | null
          provider_calendar_id: string
          read_only?: boolean | null
          sync_cursor?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          calendar_name?: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email_account_id?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_synced_at?: string | null
          provider_calendar_id?: string
          read_only?: boolean | null
          sync_cursor?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_metadata_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_metadata_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          archived_at: string | null
          avatar_url: string | null
          company: string | null
          created_at: string | null
          created_by: string | null
          email: string
          email_count: number | null
          id: string
          is_favorite: boolean | null
          is_priority_sender: boolean | null
          job_title: string | null
          last_emailed_at: string | null
          metadata: Json | null
          name: string | null
          notes: string | null
          phone: string | null
          source: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          email_count?: number | null
          id?: string
          is_favorite?: boolean | null
          is_priority_sender?: boolean | null
          job_title?: string | null
          last_emailed_at?: string | null
          metadata?: Json | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          email_count?: number | null
          id?: string
          is_favorite?: boolean | null
          is_priority_sender?: boolean | null
          job_title?: string | null
          last_emailed_at?: string | null
          metadata?: Json | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_labels: {
        Row: {
          archived_at: string | null
          color: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          sort_order: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_labels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      drafts: {
        Row: {
          archived_at: string | null
          attachments: Json | null
          auto_saved: boolean | null
          bcc_recipients: Json | null
          body_html: string | null
          body_text: string | null
          cc_recipients: Json | null
          created_at: string | null
          created_by: string | null
          email_account_id: string | null
          forward_from_id: string | null
          id: string
          provider_draft_id: string | null
          reply_to_message_id: string | null
          subject: string | null
          to_recipients: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          attachments?: Json | null
          auto_saved?: boolean | null
          bcc_recipients?: Json | null
          body_html?: string | null
          body_text?: string | null
          cc_recipients?: Json | null
          created_at?: string | null
          created_by?: string | null
          email_account_id?: string | null
          forward_from_id?: string | null
          id?: string
          provider_draft_id?: string | null
          reply_to_message_id?: string | null
          subject?: string | null
          to_recipients?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          attachments?: Json | null
          auto_saved?: boolean | null
          bcc_recipients?: Json | null
          body_html?: string | null
          body_text?: string | null
          cc_recipients?: Json | null
          created_at?: string | null
          created_by?: string | null
          email_account_id?: string | null
          forward_from_id?: string | null
          id?: string
          provider_draft_id?: string | null
          reply_to_message_id?: string | null
          subject?: string | null
          to_recipients?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drafts_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          email: string
          error_message: string | null
          id: string
          is_primary: boolean | null
          last_synced_at: string | null
          metadata: Json | null
          name: string | null
          provider: Database["public"]["Enums"]["provider_type"]
          sync_cursor: string | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          error_message?: string | null
          id?: string
          is_primary?: boolean | null
          last_synced_at?: string | null
          metadata?: Json | null
          name?: string | null
          provider: Database["public"]["Enums"]["provider_type"]
          sync_cursor?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          error_message?: string | null
          id?: string
          is_primary?: boolean | null
          last_synced_at?: string | null
          metadata?: Json | null
          name?: string | null
          provider?: Database["public"]["Enums"]["provider_type"]
          sync_cursor?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_rules: {
        Row: {
          actions: Json
          applied_count: number | null
          archived_at: string | null
          conditions: Json
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          match_mode: string | null
          name: string
          priority: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actions: Json
          applied_count?: number | null
          archived_at?: string | null
          conditions: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          match_mode?: string | null
          name: string
          priority?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actions?: Json
          applied_count?: number | null
          archived_at?: string | null
          conditions?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          match_mode?: string | null
          name?: string
          priority?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          archived_at: string | null
          body_html: string
          body_text: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          subject: string | null
          updated_at: string | null
          use_count: number | null
          user_id: string
          variables: string[] | null
        }
        Insert: {
          archived_at?: string | null
          body_html: string
          body_text?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          subject?: string | null
          updated_at?: string | null
          use_count?: number | null
          user_id: string
          variables?: string[] | null
        }
        Update: {
          archived_at?: string | null
          body_html?: string
          body_text?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          subject?: string | null
          updated_at?: string | null
          use_count?: number | null
          user_id?: string
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_leads: {
        Row: {
          archived_at: string | null
          company_name: string
          contact_email: string
          contact_name: string
          created_at: string | null
          created_by: string | null
          id: string
          message: string | null
          phone: string | null
          seats_needed: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          company_name: string
          contact_email: string
          contact_name: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          message?: string | null
          phone?: string | null
          seats_needed?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          company_name?: string
          contact_email?: string
          contact_name?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          message?: string | null
          phone?: string | null
          seats_needed?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          metadata: Json | null
          organization_id: string | null
          payload: Json | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          payload?: Json | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      folder_mappings: {
        Row: {
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          email_account_id: string
          folder_name: string
          folder_type: Database["public"]["Enums"]["folder_type"]
          id: string
          is_active: boolean | null
          is_system_folder: boolean | null
          last_synced_at: string | null
          provider_folder_id: string
          total_count: number | null
          unread_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email_account_id: string
          folder_name: string
          folder_type: Database["public"]["Enums"]["folder_type"]
          id?: string
          is_active?: boolean | null
          is_system_folder?: boolean | null
          last_synced_at?: string | null
          provider_folder_id: string
          total_count?: number | null
          unread_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email_account_id?: string
          folder_name?: string
          folder_type?: Database["public"]["Enums"]["folder_type"]
          id?: string
          is_active?: boolean | null
          is_system_folder?: boolean | null
          last_synced_at?: string | null
          provider_folder_id?: string
          total_count?: number | null
          unread_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folder_mappings_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folder_mappings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonate_sessions: {
        Row: {
          admin_user_id: string
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          ended_at: string | null
          id: string
          ip_address: string | null
          reason: string
          started_at: string | null
          target_user_id: string
          updated_at: string | null
        }
        Insert: {
          admin_user_id: string
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          reason: string
          started_at?: string | null
          target_user_id: string
          updated_at?: string | null
        }
        Update: {
          admin_user_id?: string
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          reason?: string
          started_at?: string | null
          target_user_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impersonate_sessions_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonate_sessions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_cents: number
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          id: string
          paid_at: string | null
          pdf_url: string | null
          period_end: string | null
          period_start: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          stripe_invoice_id: string | null
          subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          paid_at?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          stripe_invoice_id?: string | null
          subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          paid_at?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          stripe_invoice_id?: string | null
          subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      message_labels: {
        Row: {
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          label_id: string
          message_id: string
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          label_id: string
          message_id: string
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          label_id?: string
          message_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "custom_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_labels_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          archived_at: string | null
          attachments: Json | null
          bcc_recipients: Json | null
          body_html: string | null
          body_text: string | null
          categories: string[] | null
          cc_recipients: Json | null
          created_at: string | null
          created_by: string | null
          email_account_id: string
          folder_id: string | null
          folder_type: Database["public"]["Enums"]["folder_type"] | null
          from_email: string
          from_name: string | null
          has_attachments: boolean | null
          id: string
          importance: string | null
          is_draft: boolean | null
          is_starred: boolean | null
          is_unread: boolean | null
          message_date: string
          provider_message_id: string
          provider_thread_id: string | null
          reply_to: Json | null
          search_vector: unknown
          snippet: string | null
          subject: string | null
          synced_at: string | null
          to_recipients: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          attachments?: Json | null
          bcc_recipients?: Json | null
          body_html?: string | null
          body_text?: string | null
          categories?: string[] | null
          cc_recipients?: Json | null
          created_at?: string | null
          created_by?: string | null
          email_account_id: string
          folder_id?: string | null
          folder_type?: Database["public"]["Enums"]["folder_type"] | null
          from_email: string
          from_name?: string | null
          has_attachments?: boolean | null
          id?: string
          importance?: string | null
          is_draft?: boolean | null
          is_starred?: boolean | null
          is_unread?: boolean | null
          message_date: string
          provider_message_id: string
          provider_thread_id?: string | null
          reply_to?: Json | null
          search_vector?: unknown
          snippet?: string | null
          subject?: string | null
          synced_at?: string | null
          to_recipients?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          attachments?: Json | null
          bcc_recipients?: Json | null
          body_html?: string | null
          body_text?: string | null
          categories?: string[] | null
          cc_recipients?: Json | null
          created_at?: string | null
          created_by?: string | null
          email_account_id?: string
          folder_id?: string | null
          folder_type?: Database["public"]["Enums"]["folder_type"] | null
          from_email?: string
          from_name?: string | null
          has_attachments?: boolean | null
          id?: string
          importance?: string | null
          is_draft?: boolean | null
          is_starred?: boolean | null
          is_unread?: boolean | null
          message_date?: string
          provider_message_id?: string
          provider_thread_id?: string | null
          reply_to?: Json | null
          search_vector?: unknown
          snippet?: string | null
          subject?: string | null
          synced_at?: string | null
          to_recipients?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          link: string | null
          message: string
          read: boolean | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          link?: string | null
          message: string
          read?: boolean | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          link?: string | null
          message?: string
          read?: boolean | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_tokens: {
        Row: {
          access_token: string
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          email_account_id: string
          id: string
          provider: Database["public"]["Enums"]["provider_type"]
          refresh_token: string
          scopes: string[] | null
          token_expires_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email_account_id: string
          id?: string
          provider: Database["public"]["Enums"]["provider_type"]
          refresh_token: string
          scopes?: string[] | null
          token_expires_at: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email_account_id?: string
          id?: string
          provider?: Database["public"]["Enums"]["provider_type"]
          refresh_token?: string
          scopes?: string[] | null
          token_expires_at?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_tokens_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: true
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string | null
          status: Database["public"]["Enums"]["invite_status"] | null
          token: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by: string
          organization_id: string
          role?: string | null
          status?: Database["public"]["Enums"]["invite_status"] | null
          token: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: string | null
          status?: Database["public"]["Enums"]["invite_status"] | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_admin: boolean | null
          joined_at: string | null
          organization_id: string
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_admin?: boolean | null
          joined_at?: string | null
          organization_id: string
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_admin?: boolean | null
          joined_at?: string | null
          organization_id?: string
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          archived_at: string | null
          billing_email: string
          created_at: string | null
          created_by: string | null
          domain: string | null
          id: string
          logo_url: string | null
          name: string
          plan: Database["public"]["Enums"]["plan_type"] | null
          seats: number | null
          seats_used: number | null
          settings: Json | null
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          billing_email: string
          created_at?: string | null
          created_by?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          name: string
          plan?: Database["public"]["Enums"]["plan_type"] | null
          seats?: number | null
          seats_used?: number | null
          settings?: Json | null
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          billing_email?: string
          created_at?: string | null
          created_by?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          plan?: Database["public"]["Enums"]["plan_type"] | null
          seats?: number | null
          seats_used?: number | null
          settings?: Json | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          archived_at: string | null
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last4: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_default: boolean | null
          organization_id: string | null
          stripe_payment_method_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          organization_id?: string | null
          stripe_payment_method_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          organization_id?: string | null
          stripe_payment_method_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      priority_senders: {
        Row: {
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          email: string
          id: string
          is_blocked: boolean | null
          name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          id?: string
          is_blocked?: boolean | null
          name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          id?: string
          is_blocked?: boolean | null
          name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "priority_senders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number | null
          key: string
          window_start: string
        }
        Insert: {
          count?: number | null
          key: string
          window_start?: string
        }
        Update: {
          count?: number | null
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      scheduled_emails: {
        Row: {
          archived_at: string | null
          attachments: Json | null
          bcc_recipients: Json | null
          body_html: string
          cc_recipients: Json | null
          created_at: string | null
          created_by: string | null
          email_account_id: string
          error_message: string | null
          id: string
          retry_count: number | null
          scheduled_for: string
          sent_at: string | null
          status: Database["public"]["Enums"]["email_status"] | null
          subject: string | null
          to_recipients: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          attachments?: Json | null
          bcc_recipients?: Json | null
          body_html: string
          cc_recipients?: Json | null
          created_at?: string | null
          created_by?: string | null
          email_account_id: string
          error_message?: string | null
          id?: string
          retry_count?: number | null
          scheduled_for: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"] | null
          subject?: string | null
          to_recipients: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          attachments?: Json | null
          bcc_recipients?: Json | null
          body_html?: string
          cc_recipients?: Json | null
          created_at?: string | null
          created_by?: string | null
          email_account_id?: string
          error_message?: string | null
          id?: string
          retry_count?: number | null
          scheduled_for?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"] | null
          subject?: string | null
          to_recipients?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_emails_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_emails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sender_groups: {
        Row: {
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          group_name: string | null
          id: string
          is_grouped: boolean | null
          sender_email: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          group_name?: string | null
          id?: string
          is_grouped?: boolean | null
          sender_email: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          group_name?: string | null
          id?: string
          is_grouped?: boolean | null
          sender_email?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sender_groups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      signatures: {
        Row: {
          archived_at: string | null
          content_html: string
          content_text: string | null
          created_at: string | null
          created_by: string | null
          email_account_id: string | null
          id: string
          is_default: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          content_html: string
          content_text?: string | null
          created_at?: string | null
          created_by?: string | null
          email_account_id?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          content_html?: string
          content_text?: string | null
          created_at?: string | null
          created_by?: string | null
          email_account_id?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signatures_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_messages: {
        Row: {
          archived_at: string | null
          body: string
          created_at: string | null
          created_by: string | null
          direction: string
          from_number: string
          id: string
          status: string | null
          to_number: string
          twilio_sid: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          body: string
          created_at?: string | null
          created_by?: string | null
          direction: string
          from_number: string
          id?: string
          status?: string | null
          to_number: string
          twilio_sid?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          body?: string
          created_at?: string | null
          created_by?: string | null
          direction?: string
          from_number?: string
          id?: string
          status?: string | null
          to_number?: string
          twilio_sid?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      snoozed_emails: {
        Row: {
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          message_id: string
          original_folder_type: Database["public"]["Enums"]["folder_type"]
          snooze_until: string
          unsnoozed: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          message_id: string
          original_folder_type: Database["public"]["Enums"]["folder_type"]
          snooze_until: string
          unsnoozed?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          message_id?: string
          original_folder_type?: Database["public"]["Enums"]["folder_type"]
          snooze_until?: string
          unsnoozed?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snoozed_emails_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snoozed_emails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      spam_reports: {
        Row: {
          archived_at: string | null
          auto_detected: boolean | null
          created_at: string | null
          created_by: string | null
          id: string
          message_id: string | null
          reason: string | null
          reported_email: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          auto_detected?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          message_id?: string | null
          reason?: string | null
          reported_email: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          auto_detected?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          message_id?: string | null
          reason?: string | null
          reported_email?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spam_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spam_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          archived_at: string | null
          cancel_at: string | null
          canceled_at: string | null
          created_at: string | null
          created_by: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string | null
          plan: Database["public"]["Enums"]["plan_type"]
          seats: number | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id: string
          stripe_subscription_id: string
          trial_end: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string | null
          plan: Database["public"]["Enums"]["plan_type"]
          seats?: number | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id: string
          stripe_subscription_id: string
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          seats?: number | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id?: string
          stripe_subscription_id?: string
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_checkpoints: {
        Row: {
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          cursor: string | null
          email_account_id: string
          error_count: number | null
          id: string
          last_error: string | null
          last_successful_at: string | null
          sync_type: string
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          cursor?: string | null
          email_account_id: string
          error_count?: number | null
          id?: string
          last_error?: string | null
          last_successful_at?: string | null
          sync_type: string
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          cursor?: string | null
          email_account_id?: string
          error_count?: number | null
          id?: string
          last_error?: string | null
          last_successful_at?: string | null
          sync_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_checkpoints_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          archived_at: string | null
          count: number | null
          created_at: string | null
          created_by: string | null
          feature: string
          id: string
          metadata: Json | null
          organization_id: string | null
          timestamp: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          count?: number | null
          created_at?: string | null
          created_by?: string | null
          feature: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          timestamp?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          count?: number | null
          created_at?: string | null
          created_by?: string | null
          feature?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          timestamp?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_login_tracking: {
        Row: {
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          login_at: string | null
          success: boolean | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          login_at?: string | null
          success?: boolean | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          login_at?: string | null
          success?: boolean | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_login_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          ai_features_enabled: boolean | null
          archived_at: string | null
          auto_categorize: boolean | null
          compose_font: string | null
          compose_font_size: number | null
          conversations_enabled: boolean | null
          created_at: string | null
          created_by: string | null
          id: string
          inbox_layout: string | null
          keyboard_shortcuts: boolean | null
          notification_schedule: Json | null
          notification_sound: boolean | null
          notifications_enabled: boolean | null
          reading_pane_position: string | null
          sidebar_mode: string | null
          swipe_actions: Json | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_features_enabled?: boolean | null
          archived_at?: string | null
          auto_categorize?: boolean | null
          compose_font?: string | null
          compose_font_size?: number | null
          conversations_enabled?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          inbox_layout?: string | null
          keyboard_shortcuts?: boolean | null
          notification_schedule?: Json | null
          notification_sound?: boolean | null
          notifications_enabled?: boolean | null
          reading_pane_position?: string | null
          sidebar_mode?: string | null
          swipe_actions?: Json | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_features_enabled?: boolean | null
          archived_at?: string | null
          auto_categorize?: boolean | null
          compose_font?: string | null
          compose_font_size?: number | null
          conversations_enabled?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          inbox_layout?: string | null
          keyboard_shortcuts?: boolean | null
          notification_schedule?: Json | null
          notification_sound?: boolean | null
          notifications_enabled?: boolean | null
          reading_pane_position?: string | null
          sidebar_mode?: string | null
          swipe_actions?: Json | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          archived_at: string | null
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          email: string
          id: string
          is_super_admin: boolean | null
          last_login_at: string | null
          locale: string | null
          login_count: number | null
          name: string | null
          nickname: string | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          remember_me: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          session_expires_at: string | null
          timezone: string | null
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          id: string
          is_super_admin?: boolean | null
          last_login_at?: string | null
          locale?: string | null
          login_count?: number | null
          name?: string | null
          nickname?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          remember_me?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          session_expires_at?: string | null
          timezone?: string | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          id?: string
          is_super_admin?: boolean | null
          last_login_at?: string | null
          locale?: string | null
          login_count?: number | null
          name?: string | null
          nickname?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          remember_me?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          session_expires_at?: string | null
          timezone?: string | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          delivered_at: string | null
          event: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          updated_at: string | null
          webhook_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          event: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          updated_at?: string | null
          webhook_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          event?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          updated_at?: string | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          events: string[]
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          secret: string
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          events: string[]
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          secret: string
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          events?: string[]
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          secret?: string
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      decrement_org_seats_used: {
        Args: { p_org_id: string }
        Returns: undefined
      }
      decrypt_oauth_tokens: {
        Args: { p_encryption_key?: string; token_id: string }
        Returns: {
          access_token: string
          refresh_token: string
        }[]
      }
      emit_event: {
        Args: {
          p_actor_id: string
          p_entity_id: string
          p_entity_type: string
          p_event_type: Database["public"]["Enums"]["event_type"]
          p_metadata?: Json
          p_organization_id?: string
          p_payload?: Json
        }
        Returns: string
      }
      increment_column: {
        Args: { column_name: string; row_id: string; table_name: string }
        Returns: undefined
      }
      increment_contact_email_count: {
        Args: { p_email: string; p_user_id: string }
        Returns: undefined
      }
      increment_org_seats_used: {
        Args: { p_org_id: string }
        Returns: undefined
      }
      insert_oauth_tokens: {
        Args: {
          p_access_token: string
          p_email_account_id: string
          p_encryption_key?: string
          p_provider: Database["public"]["Enums"]["provider_type"]
          p_refresh_token: string
          p_scopes: string[]
          p_token_expires_at: string
          p_user_id: string
        }
        Returns: undefined
      }
      update_oauth_tokens: {
        Args: {
          new_access_token: string
          new_expires_at: string
          new_refresh_token: string
          p_encryption_key?: string
          token_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      audit_action:
        | "create"
        | "read"
        | "update"
        | "delete"
        | "login"
        | "logout"
        | "impersonate"
        | "export"
        | "bulk_action"
      email_status:
        | "draft"
        | "queued"
        | "sending"
        | "sent"
        | "failed"
        | "bounced"
      event_rsvp: "accepted" | "declined" | "tentative" | "none"
      event_type:
        | "user.created"
        | "user.onboarding_completed"
        | "user.profile_updated"
        | "user.login"
        | "user.logout"
        | "email_account.connected"
        | "email_account.disconnected"
        | "email_account.sync_started"
        | "email_account.sync_completed"
        | "email_account.sync_error"
        | "token.refreshed"
        | "token.refresh_failed"
        | "token.near_expiry"
        | "message.received"
        | "message.sent"
        | "message.deleted"
        | "message.read"
        | "message.unread"
        | "message.starred"
        | "message.unstarred"
        | "message.moved"
        | "message.labeled"
        | "message.unlabeled"
        | "message.archived"
        | "draft.created"
        | "draft.auto_saved"
        | "draft.updated"
        | "draft.deleted"
        | "scheduled_email.created"
        | "scheduled_email.due"
        | "scheduled_email.sent"
        | "scheduled_email.failed"
        | "scheduled_email.canceled"
        | "snooze.created"
        | "snooze.expired"
        | "snooze.canceled"
        | "org.created"
        | "org.updated"
        | "org.deleted"
        | "org.member_added"
        | "org.member_removed"
        | "org.ownership_transferred"
        | "invite.created"
        | "invite.accepted"
        | "invite.expired"
        | "invite.revoked"
        | "subscription.created"
        | "subscription.activated"
        | "subscription.trial_ending"
        | "subscription.payment_failed"
        | "subscription.canceled"
        | "subscription.updated"
        | "contact.created"
        | "contact.updated"
        | "contact.deleted"
        | "contact.imported"
        | "label.created"
        | "label.updated"
        | "label.deleted"
        | "label.applied"
        | "label.removed"
        | "email_rule.created"
        | "email_rule.updated"
        | "email_rule.deleted"
        | "email_rule.applied"
        | "calendar_event.created"
        | "calendar_event.updated"
        | "calendar_event.deleted"
        | "calendar_event.rsvp_changed"
        | "signature.created"
        | "signature.updated"
        | "signature.deleted"
        | "email_template.created"
        | "email_template.updated"
        | "email_template.deleted"
        | "email_template.used"
        | "impersonate.started"
        | "impersonate.ended"
        | "webhook.created"
        | "webhook.deleted"
        | "webhook.triggered"
        | "webhook.failed"
        | "api_key.created"
        | "api_key.used"
        | "api_key.deleted"
        | "system_setting.updated"
        | "notification.created"
      folder_type:
        | "inbox"
        | "sent"
        | "drafts"
        | "trash"
        | "spam"
        | "archive"
        | "starred"
        | "important"
        | "snoozed"
        | "custom"
      invite_status: "pending" | "accepted" | "expired" | "revoked"
      invoice_status: "draft" | "open" | "paid" | "void" | "uncollectible"
      notification_type: "info" | "warning" | "error" | "success"
      plan_type: "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE"
      provider_type: "GOOGLE" | "MICROSOFT"
      subscription_status:
        | "active"
        | "past_due"
        | "canceled"
        | "trialing"
        | "paused"
      sync_status: "idle" | "syncing" | "error" | "paused"
      user_role: "SUPER_ADMIN" | "ORG_OWNER" | "ORG_MEMBER" | "INDIVIDUAL"
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
    Enums: {
      audit_action: [
        "create",
        "read",
        "update",
        "delete",
        "login",
        "logout",
        "impersonate",
        "export",
        "bulk_action",
      ],
      email_status: ["draft", "queued", "sending", "sent", "failed", "bounced"],
      event_rsvp: ["accepted", "declined", "tentative", "none"],
      event_type: [
        "user.created",
        "user.onboarding_completed",
        "user.profile_updated",
        "user.login",
        "user.logout",
        "email_account.connected",
        "email_account.disconnected",
        "email_account.sync_started",
        "email_account.sync_completed",
        "email_account.sync_error",
        "token.refreshed",
        "token.refresh_failed",
        "token.near_expiry",
        "message.received",
        "message.sent",
        "message.deleted",
        "message.read",
        "message.unread",
        "message.starred",
        "message.unstarred",
        "message.moved",
        "message.labeled",
        "message.unlabeled",
        "message.archived",
        "draft.created",
        "draft.auto_saved",
        "draft.updated",
        "draft.deleted",
        "scheduled_email.created",
        "scheduled_email.due",
        "scheduled_email.sent",
        "scheduled_email.failed",
        "scheduled_email.canceled",
        "snooze.created",
        "snooze.expired",
        "snooze.canceled",
        "org.created",
        "org.updated",
        "org.deleted",
        "org.member_added",
        "org.member_removed",
        "org.ownership_transferred",
        "invite.created",
        "invite.accepted",
        "invite.expired",
        "invite.revoked",
        "subscription.created",
        "subscription.activated",
        "subscription.trial_ending",
        "subscription.payment_failed",
        "subscription.canceled",
        "subscription.updated",
        "contact.created",
        "contact.updated",
        "contact.deleted",
        "contact.imported",
        "label.created",
        "label.updated",
        "label.deleted",
        "label.applied",
        "label.removed",
        "email_rule.created",
        "email_rule.updated",
        "email_rule.deleted",
        "email_rule.applied",
        "calendar_event.created",
        "calendar_event.updated",
        "calendar_event.deleted",
        "calendar_event.rsvp_changed",
        "signature.created",
        "signature.updated",
        "signature.deleted",
        "email_template.created",
        "email_template.updated",
        "email_template.deleted",
        "email_template.used",
        "impersonate.started",
        "impersonate.ended",
        "webhook.created",
        "webhook.deleted",
        "webhook.triggered",
        "webhook.failed",
        "api_key.created",
        "api_key.used",
        "api_key.deleted",
        "system_setting.updated",
        "notification.created",
      ],
      folder_type: [
        "inbox",
        "sent",
        "drafts",
        "trash",
        "spam",
        "archive",
        "starred",
        "important",
        "snoozed",
        "custom",
      ],
      invite_status: ["pending", "accepted", "expired", "revoked"],
      invoice_status: ["draft", "open", "paid", "void", "uncollectible"],
      notification_type: ["info", "warning", "error", "success"],
      plan_type: ["FREE", "PRO", "BUSINESS", "ENTERPRISE"],
      provider_type: ["GOOGLE", "MICROSOFT"],
      subscription_status: [
        "active",
        "past_due",
        "canceled",
        "trialing",
        "paused",
      ],
      sync_status: ["idle", "syncing", "error", "paused"],
      user_role: ["SUPER_ADMIN", "ORG_OWNER", "ORG_MEMBER", "INDIVIDUAL"],
    },
  },
} as const

// Type Helpers - Table Row Types
export type ApiKey = Database['public']['Tables']['api_keys']['Row']
export type ApiKeyInsert = Database['public']['Tables']['api_keys']['Insert']
export type ApiKeyUpdate = Database['public']['Tables']['api_keys']['Update']

export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert']
export type AuditLogUpdate = Database['public']['Tables']['audit_logs']['Update']

export type BackupCode = Database['public']['Tables']['backup_codes']['Row']
export type BackupCodeInsert = Database['public']['Tables']['backup_codes']['Insert']
export type BackupCodeUpdate = Database['public']['Tables']['backup_codes']['Update']

export type CalendarEvent = Database['public']['Tables']['calendar_events']['Row']
export type CalendarEventInsert = Database['public']['Tables']['calendar_events']['Insert']
export type CalendarEventUpdate = Database['public']['Tables']['calendar_events']['Update']

export type CalendarMetadata = Database['public']['Tables']['calendar_metadata']['Row']
export type CalendarMetadataInsert = Database['public']['Tables']['calendar_metadata']['Insert']
export type CalendarMetadataUpdate = Database['public']['Tables']['calendar_metadata']['Update']

// CalendarAttendee and CalendarReminder are stored as JSON in calendar_events table
export type CalendarAttendee = any // TODO: Define proper type from calendar_events.attendees JSON
export type CalendarReminder = any // TODO: Define proper type from calendar_events.reminders JSON

export type Contact = Database['public']['Tables']['contacts']['Row']
export type ContactInsert = Database['public']['Tables']['contacts']['Insert']
export type ContactUpdate = Database['public']['Tables']['contacts']['Update']

export type CustomLabel = Database['public']['Tables']['custom_labels']['Row']
export type CustomLabelInsert = Database['public']['Tables']['custom_labels']['Insert']
export type CustomLabelUpdate = Database['public']['Tables']['custom_labels']['Update']

export type Draft = Database['public']['Tables']['drafts']['Row']
export type DraftInsert = Database['public']['Tables']['drafts']['Insert']
export type DraftUpdate = Database['public']['Tables']['drafts']['Update']

export type EmailAccount = Database['public']['Tables']['email_accounts']['Row']
export type EmailAccountInsert = Database['public']['Tables']['email_accounts']['Insert']
export type EmailAccountUpdate = Database['public']['Tables']['email_accounts']['Update']

// EmailAttachment and EmailRecipient are stored as JSON in messages table or don't exist yet
export type EmailAttachment = any // TODO: Define proper type or create table
export type EmailRecipient = any // TODO: Define proper type or create table

export type EmailRule = Database['public']['Tables']['email_rules']['Row']
export type EmailRuleInsert = Database['public']['Tables']['email_rules']['Insert']
export type EmailRuleUpdate = Database['public']['Tables']['email_rules']['Update']

// EmailRuleAction and EmailRuleCondition are stored as JSON in email_rules table
export type EmailRuleAction = any // TODO: Define proper type from email_rules.actions JSON
export type EmailRuleCondition = any // TODO: Define proper type from email_rules.conditions JSON

// EmailStatus might be stored differently or doesn't exist yet
export type EmailStatus = any // TODO: Define proper type or create table

export type EmailTemplate = Database['public']['Tables']['email_templates']['Row']
export type EmailTemplateInsert = Database['public']['Tables']['email_templates']['Insert']
export type EmailTemplateUpdate = Database['public']['Tables']['email_templates']['Update']

export type EnterpriseLead = Database['public']['Tables']['enterprise_leads']['Row']
export type EnterpriseLeadInsert = Database['public']['Tables']['enterprise_leads']['Insert']
export type EnterpriseLeadUpdate = Database['public']['Tables']['enterprise_leads']['Update']

// EventRsvp is stored as enum in calendar_events.rsvp_status
export type EventRsvp = Database['public']['Enums']['event_rsvp']

export type FolderMapping = Database['public']['Tables']['folder_mappings']['Row']
export type FolderMappingInsert = Database['public']['Tables']['folder_mappings']['Insert']
export type FolderMappingUpdate = Database['public']['Tables']['folder_mappings']['Update']

export type ImpersonateSession = Database['public']['Tables']['impersonate_sessions']['Row']
export type ImpersonateSessionInsert = Database['public']['Tables']['impersonate_sessions']['Insert']
export type ImpersonateSessionUpdate = Database['public']['Tables']['impersonate_sessions']['Update']

export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']

export type Message = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type MessageUpdate = Database['public']['Tables']['messages']['Update']

export type MessageLabel = Database['public']['Tables']['message_labels']['Row']
export type MessageLabelInsert = Database['public']['Tables']['message_labels']['Insert']
export type MessageLabelUpdate = Database['public']['Tables']['message_labels']['Update']

// Notification table is named notification_queue
export type Notification = Database['public']['Tables']['notification_queue']['Row']
export type NotificationInsert = Database['public']['Tables']['notification_queue']['Insert']
export type NotificationUpdate = Database['public']['Tables']['notification_queue']['Update']

// NotificationSchedule doesn't exist as separate table
export type NotificationSchedule = any // TODO: Define proper type or create table

export type OAuthToken = Database['public']['Tables']['oauth_tokens']['Row']
export type OAuthTokenInsert = Database['public']['Tables']['oauth_tokens']['Insert']
export type OAuthTokenUpdate = Database['public']['Tables']['oauth_tokens']['Update']

export type Organization = Database['public']['Tables']['organizations']['Row']
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']

export type OrganizationInvite = Database['public']['Tables']['organization_invites']['Row']
export type OrganizationInviteInsert = Database['public']['Tables']['organization_invites']['Insert']
export type OrganizationInviteUpdate = Database['public']['Tables']['organization_invites']['Update']

export type OrganizationMember = Database['public']['Tables']['organization_members']['Row']
export type OrganizationMemberInsert = Database['public']['Tables']['organization_members']['Insert']
export type OrganizationMemberUpdate = Database['public']['Tables']['organization_members']['Update']

export type PaymentMethod = Database['public']['Tables']['payment_methods']['Row']
export type PaymentMethodInsert = Database['public']['Tables']['payment_methods']['Insert']
export type PaymentMethodUpdate = Database['public']['Tables']['payment_methods']['Update']

export type PrioritySender = Database['public']['Tables']['priority_senders']['Row']
export type PrioritySenderInsert = Database['public']['Tables']['priority_senders']['Insert']
export type PrioritySenderUpdate = Database['public']['Tables']['priority_senders']['Update']

export type RateLimit = Database['public']['Tables']['rate_limits']['Row']
export type RateLimitInsert = Database['public']['Tables']['rate_limits']['Insert']
export type RateLimitUpdate = Database['public']['Tables']['rate_limits']['Update']

export type ScheduledEmail = Database['public']['Tables']['scheduled_emails']['Row']
export type ScheduledEmailInsert = Database['public']['Tables']['scheduled_emails']['Insert']
export type ScheduledEmailUpdate = Database['public']['Tables']['scheduled_emails']['Update']

export type SenderGroup = Database['public']['Tables']['sender_groups']['Row']
export type SenderGroupInsert = Database['public']['Tables']['sender_groups']['Insert']
export type SenderGroupUpdate = Database['public']['Tables']['sender_groups']['Update']

export type Signature = Database['public']['Tables']['signatures']['Row']
export type SignatureInsert = Database['public']['Tables']['signatures']['Insert']
export type SignatureUpdate = Database['public']['Tables']['signatures']['Update']

export type SmsMessage = Database['public']['Tables']['sms_messages']['Row']
export type SmsMessageInsert = Database['public']['Tables']['sms_messages']['Insert']
export type SmsMessageUpdate = Database['public']['Tables']['sms_messages']['Update']

export type SnoozedEmail = Database['public']['Tables']['snoozed_emails']['Row']
export type SnoozedEmailInsert = Database['public']['Tables']['snoozed_emails']['Insert']
export type SnoozedEmailUpdate = Database['public']['Tables']['snoozed_emails']['Update']

export type SpamReport = Database['public']['Tables']['spam_reports']['Row']
export type SpamReportInsert = Database['public']['Tables']['spam_reports']['Insert']
export type SpamReportUpdate = Database['public']['Tables']['spam_reports']['Update']

export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']
export type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']

// SwipeActions doesn't exist as table (may be in user_preferences JSON)
export type SwipeActions = any // TODO: Define proper type from user_preferences

export type SyncCheckpoint = Database['public']['Tables']['sync_checkpoints']['Row']
export type SyncCheckpointInsert = Database['public']['Tables']['sync_checkpoints']['Insert']
export type SyncCheckpointUpdate = Database['public']['Tables']['sync_checkpoints']['Update']

export type SystemSetting = Database['public']['Tables']['system_settings']['Row']
export type SystemSettingInsert = Database['public']['Tables']['system_settings']['Insert']
export type SystemSettingUpdate = Database['public']['Tables']['system_settings']['Update']

export type UsageTracking = Database['public']['Tables']['usage_tracking']['Row']
export type UsageTrackingInsert = Database['public']['Tables']['usage_tracking']['Insert']
export type UsageTrackingUpdate = Database['public']['Tables']['usage_tracking']['Update']

export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type UserLoginTracking = Database['public']['Tables']['user_login_tracking']['Row']
export type UserLoginTrackingInsert = Database['public']['Tables']['user_login_tracking']['Insert']
export type UserLoginTrackingUpdate = Database['public']['Tables']['user_login_tracking']['Update']

export type UserPreferences = Database['public']['Tables']['user_preferences']['Row']
export type UserPreferencesInsert = Database['public']['Tables']['user_preferences']['Insert']
export type UserPreferencesUpdate = Database['public']['Tables']['user_preferences']['Update']

export type Webhook = Database['public']['Tables']['webhooks']['Row']
export type WebhookInsert = Database['public']['Tables']['webhooks']['Insert']
export type WebhookUpdate = Database['public']['Tables']['webhooks']['Update']

export type WebhookDelivery = Database['public']['Tables']['webhook_deliveries']['Row']
export type WebhookDeliveryInsert = Database['public']['Tables']['webhook_deliveries']['Insert']
export type WebhookDeliveryUpdate = Database['public']['Tables']['webhook_deliveries']['Update']

// Enum Types
export type AuditAction = Database['public']['Enums']['audit_action']
export type FolderType = Database['public']['Enums']['folder_type']
export type InviteStatus = Database['public']['Enums']['invite_status']
export type InvoiceStatus = Database['public']['Enums']['invoice_status']
export type NotificationType = Database['public']['Enums']['notification_type']
export type PlanType = Database['public']['Enums']['plan_type']
export type ProviderType = Database['public']['Enums']['provider_type']
export type SubscriptionStatus = Database['public']['Enums']['subscription_status']
export type SyncStatus = Database['public']['Enums']['sync_status']
export type UserRole = Database['public']['Enums']['user_role']
