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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json
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
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json
          organization_id: string | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          business_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          business_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          business_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          captive_portal_language: string
          captive_portal_template: string
          created_at: string
          email: string | null
          hotspot_username_prefix: string
          id: string
          logo_url: string | null
          name: string
          organization_id: string | null
          phone: string | null
          primary_color: string | null
          prune_inactive_after_days: number | null
          redirect_url_after_purchase: string | null
          stripe_enabled: boolean
          support_email: string | null
          support_phone: string | null
          terms_and_conditions: string | null
          theme_preference: string
          type: Database["public"]["Enums"]["business_type"]
          updated_at: string
          voucher_expiry_days: number | null
          welcome_message: string | null
        }
        Insert: {
          captive_portal_language?: string
          captive_portal_template?: string
          created_at?: string
          email?: string | null
          hotspot_username_prefix?: string
          id?: string
          logo_url?: string | null
          name: string
          organization_id?: string | null
          phone?: string | null
          primary_color?: string | null
          prune_inactive_after_days?: number | null
          redirect_url_after_purchase?: string | null
          stripe_enabled?: boolean
          support_email?: string | null
          support_phone?: string | null
          terms_and_conditions?: string | null
          theme_preference?: string
          type?: Database["public"]["Enums"]["business_type"]
          updated_at?: string
          voucher_expiry_days?: number | null
          welcome_message?: string | null
        }
        Update: {
          captive_portal_language?: string
          captive_portal_template?: string
          created_at?: string
          email?: string | null
          hotspot_username_prefix?: string
          id?: string
          logo_url?: string | null
          name?: string
          organization_id?: string | null
          phone?: string | null
          primary_color?: string | null
          prune_inactive_after_days?: number | null
          redirect_url_after_purchase?: string | null
          stripe_enabled?: boolean
          support_email?: string | null
          support_phone?: string | null
          terms_and_conditions?: string | null
          theme_preference?: string
          type?: Database["public"]["Enums"]["business_type"]
          updated_at?: string
          voucher_expiry_days?: number | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hotspot_users: {
        Row: {
          business_id: string
          created_at: string
          enabled: boolean
          expires_at: string | null
          id: string
          mac_address: string | null
          package_id: string | null
          password: string
          phone: string | null
          router_id: string | null
          updated_at: string
          username: string
        }
        Insert: {
          business_id: string
          created_at?: string
          enabled?: boolean
          expires_at?: string | null
          id?: string
          mac_address?: string | null
          package_id?: string | null
          password: string
          phone?: string | null
          router_id?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          business_id?: string
          created_at?: string
          enabled?: boolean
          expires_at?: string | null
          id?: string
          mac_address?: string | null
          package_id?: string | null
          password?: string
          phone?: string | null
          router_id?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotspot_users_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotspot_users_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotspot_users_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_cents: number
          business_id: string
          created_at: string
          currency: string
          due_date: string
          id: string
          invoice_number: string
          mpesa_reference: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          plan_id: string | null
          status: string
          subscription_id: string | null
        }
        Insert: {
          amount_cents: number
          business_id: string
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          invoice_number?: string
          mpesa_reference?: string | null
          paid_at?: string | null
          period_end: string
          period_start: string
          plan_id?: string | null
          status?: string
          subscription_id?: string | null
        }
        Update: {
          amount_cents?: number
          business_id?: string
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          invoice_number?: string
          mpesa_reference?: string | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          plan_id?: string | null
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_plugins: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          manifest: Json
          name: string
          slug: string
          status: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          manifest?: Json
          name: string
          slug: string
          status?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          manifest?: Json
          name?: string
          slug?: string
          status?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mpesa_credentials: {
        Row: {
          active: boolean
          business_id: string
          consumer_key: string | null
          consumer_secret: string | null
          consumer_secret_set: boolean | null
          created_at: string
          environment: string
          id: string
          last_verified_at: string | null
          last_verified_message: string | null
          last_verified_status: string | null
          passkey: string | null
          passkey_set: boolean | null
          paybill_type: string
          shortcode: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id: string
          consumer_key?: string | null
          consumer_secret?: string | null
          created_at?: string
          environment: string
          id?: string
          last_verified_at?: string | null
          last_verified_message?: string | null
          last_verified_status?: string | null
          passkey?: string | null
          paybill_type?: string
          shortcode?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          consumer_key?: string | null
          consumer_secret?: string | null
          created_at?: string
          environment?: string
          id?: string
          last_verified_at?: string | null
          last_verified_message?: string | null
          last_verified_status?: string | null
          passkey?: string | null
          paybill_type?: string
          shortcode?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          organization_id: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          organization_id?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          organization_id?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          feature_flags: Json
          id: string
          name: string
          owner_id: string | null
          settings: Json
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          feature_flags?: Json
          id?: string
          name: string
          owner_id?: string | null
          settings?: Json
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          feature_flags?: Json
          id?: string
          name?: string
          owner_id?: string | null
          settings?: Json
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          currency: string
          data_limit_mb: number | null
          device_limit: number
          download_kbps: number | null
          duration_minutes: number
          id: string
          name: string
          price_cents: number
          updated_at: string
          upload_kbps: number | null
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          currency?: string
          data_limit_mb?: number | null
          device_limit?: number
          download_kbps?: number | null
          duration_minutes?: number
          id?: string
          name: string
          price_cents?: number
          updated_at?: string
          upload_kbps?: number | null
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          currency?: string
          data_limit_mb?: number | null
          device_limit?: number
          download_kbps?: number | null
          duration_minutes?: number
          id?: string
          name?: string
          price_cents?: number
          updated_at?: string
          upload_kbps?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          business_id: string
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          metadata: Json | null
          package_id: string | null
          paid_at: string | null
          phone: string | null
          provider: string
          provider_ref: string
          status: string
          voucher_id: string | null
        }
        Insert: {
          amount_cents?: number
          business_id: string
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          package_id?: string | null
          paid_at?: string | null
          phone?: string | null
          provider: string
          provider_ref: string
          status?: string
          voucher_id?: string | null
        }
        Update: {
          amount_cents?: number
          business_id?: string
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          package_id?: string | null
          paid_at?: string | null
          phone?: string | null
          provider?: string
          provider_ref?: string
          status?: string
          voucher_id?: string | null
        }
        Relationships: []
      }
      plan_change_notifications: {
        Row: {
          acknowledged_at: string | null
          business_id: string
          created_at: string
          effective_at: string
          from_plan_id: string | null
          id: string
          message: string
          to_plan_id: string | null
          total_properties: number
          total_rooms: number
        }
        Insert: {
          acknowledged_at?: string | null
          business_id: string
          created_at?: string
          effective_at: string
          from_plan_id?: string | null
          id?: string
          message: string
          to_plan_id?: string | null
          total_properties: number
          total_rooms: number
        }
        Update: {
          acknowledged_at?: string | null
          business_id?: string
          created_at?: string
          effective_at?: string
          from_plan_id?: string | null
          id?: string
          message?: string
          to_plan_id?: string | null
          total_properties?: number
          total_rooms?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_change_notifications_from_plan_id_fkey"
            columns: ["from_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_change_notifications_to_plan_id_fkey"
            columns: ["to_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          active: boolean
          address: string | null
          business_id: string
          created_at: string
          id: string
          name: string
          property_type: string
          room_count: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          business_id: string
          created_at?: string
          id?: string
          name: string
          property_type?: string
          room_count?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          business_id?: string
          created_at?: string
          id?: string
          name?: string
          property_type?: string
          room_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      role_definitions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          key: string
          label: string
          organization_id: string | null
          permissions: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key: string
          label: string
          organization_id?: string | null
          permissions?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string
          label?: string
          organization_id?: string | null
          permissions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "role_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      router_health: {
        Row: {
          active_users: number | null
          board_name: string | null
          business_id: string
          cpu_load: number | null
          error_message: string | null
          firmware: string | null
          id: string
          memory_used_pct: number | null
          reachable: boolean
          recorded_at: string
          router_id: string
          rx_kbps: number | null
          tx_kbps: number | null
          uptime_seconds: number | null
        }
        Insert: {
          active_users?: number | null
          board_name?: string | null
          business_id: string
          cpu_load?: number | null
          error_message?: string | null
          firmware?: string | null
          id?: string
          memory_used_pct?: number | null
          reachable?: boolean
          recorded_at?: string
          router_id: string
          rx_kbps?: number | null
          tx_kbps?: number | null
          uptime_seconds?: number | null
        }
        Update: {
          active_users?: number | null
          board_name?: string | null
          business_id?: string
          cpu_load?: number | null
          error_message?: string | null
          firmware?: string | null
          id?: string
          memory_used_pct?: number | null
          reachable?: boolean
          recorded_at?: string
          router_id?: string
          rx_kbps?: number | null
          tx_kbps?: number | null
          uptime_seconds?: number | null
        }
        Relationships: []
      }
      routers: {
        Row: {
          api_port: number
          business_id: string
          created_at: string
          host: string | null
          id: string
          last_seen_at: string | null
          name: string
          password_encrypted: string | null
          status: string
          updated_at: string
          username: string | null
          connection_mode: string
          hotspot_interface: string | null
          hotspot_cidr: string | null
          model: string | null
          ros_version: string | null
          provisioned_at: string | null
          acked_seq: number
        }
        Insert: {
          api_port?: number
          business_id: string
          created_at?: string
          host?: string | null
          id?: string
          last_seen_at?: string | null
          name: string
          password_encrypted?: string | null
          status?: string
          updated_at?: string
          username?: string | null
          connection_mode?: string
          hotspot_interface?: string | null
          hotspot_cidr?: string | null
        }
        Update: {
          api_port?: number
          business_id?: string
          created_at?: string
          host?: string | null
          id?: string
          last_seen_at?: string | null
          name?: string
          password_encrypted?: string | null
          status?: string
          updated_at?: string
          username?: string | null
          connection_mode?: string
          hotspot_interface?: string | null
          hotspot_cidr?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_wifi_access: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          data_limit_mb: number | null
          download_kbps: number | null
          enabled: boolean
          id: string
          idle_timeout_minutes: number | null
          last_synced_at: string | null
          mac_address: string | null
          notes: string | null
          package_id: string | null
          password: string
          phone: string | null
          role_label: string | null
          router_id: string | null
          session_timeout_minutes: number | null
          staff_name: string
          sync_status: string
          updated_at: string
          upload_kbps: number | null
          username: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          data_limit_mb?: number | null
          download_kbps?: number | null
          enabled?: boolean
          id?: string
          idle_timeout_minutes?: number | null
          last_synced_at?: string | null
          mac_address?: string | null
          notes?: string | null
          package_id?: string | null
          password: string
          phone?: string | null
          role_label?: string | null
          router_id?: string | null
          session_timeout_minutes?: number | null
          staff_name: string
          sync_status?: string
          updated_at?: string
          upload_kbps?: number | null
          username: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          data_limit_mb?: number | null
          download_kbps?: number | null
          enabled?: boolean
          id?: string
          idle_timeout_minutes?: number | null
          last_synced_at?: string | null
          mac_address?: string | null
          notes?: string | null
          package_id?: string | null
          password?: string
          phone?: string | null
          role_label?: string | null
          router_id?: string | null
          session_timeout_minutes?: number | null
          staff_name?: string
          sync_status?: string
          updated_at?: string
          upload_kbps?: number | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_wifi_access_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_wifi_access_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_wifi_access_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          features: Json
          max_branches: number | null
          max_routers: number | null
          max_staff_accounts: number | null
          code: string
          created_at: string
          currency: string
          examples: string[]
          id: string
          is_popular: boolean
          max_properties: number | null
          max_rooms: number | null
          min_rooms: number
          monthly_price_cents: number
          name: string
          sort_order: number
        }
        Insert: {
          features?: Json
          max_branches?: number | null
          max_routers?: number | null
          max_staff_accounts?: number | null
          code: string
          created_at?: string
          currency?: string
          examples?: string[]
          id?: string
          is_popular?: boolean
          max_properties?: number | null
          max_rooms?: number | null
          min_rooms?: number
          monthly_price_cents: number
          name: string
          sort_order?: number
        }
        Update: {
          features?: Json
          max_branches?: number | null
          max_routers?: number | null
          max_staff_accounts?: number | null
          code?: string
          created_at?: string
          currency?: string
          examples?: string[]
          id?: string
          is_popular?: boolean
          max_properties?: number | null
          max_rooms?: number | null
          min_rooms?: number
          monthly_price_cents?: number
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          auto_renew: boolean
          business_id: string
          created_at: string
          current_period_end: string
          current_period_start: string
          grace_until: string | null
          id: string
          manual_override: boolean
          override_note: string | null
          payment_method: string | null
          pending_plan_id: string | null
          plan_id: string
          status: string
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          business_id: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          grace_until?: string | null
          id?: string
          manual_override?: boolean
          override_note?: string | null
          payment_method?: string | null
          pending_plan_id?: string | null
          plan_id: string
          status?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          business_id?: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          grace_until?: string | null
          id?: string
          manual_override?: boolean
          override_note?: string | null
          payment_method?: string | null
          pending_plan_id?: string | null
          plan_id?: string
          status?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_pending_plan_id_fkey"
            columns: ["pending_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          device_limit: number | null
          guest_name: string | null
          guest_phone: string | null
          room: string | null
          batch_id: string | null
          business_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          mac_address: string | null
          package_id: string | null
          password: string
          router_id: string | null
          status: string
          used_at: string | null
          username: string
        }
        Insert: {
          device_limit?: number | null
          guest_name?: string | null
          guest_phone?: string | null
          room?: string | null
          batch_id?: string | null
          business_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          mac_address?: string | null
          package_id?: string | null
          password: string
          router_id?: string | null
          status?: string
          used_at?: string | null
          username: string
        }
        Update: {
          device_limit?: number | null
          guest_name?: string | null
          guest_phone?: string | null
          room?: string | null
          batch_id?: string | null
          business_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          mac_address?: string | null
          package_id?: string | null
          password?: string
          router_id?: string | null
          status?: string
          used_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_business_id: { Args: { _user_id: string }; Returns: string }
      has_org_role: {
        Args: { _org_id: string; _role: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_readonly: { Args: { _business_id: string }; Returns: boolean }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      create_provisioning_token: {
        Args: { _router_id: string }
        Returns: string
      }
      select_plan: {
        Args: { _plan_code: string }
        Returns: undefined
      }
      qualifying_plan_id: {
        Args: { _total_properties: number; _total_rooms: number }
        Returns: string
      }
      recalc_subscription_tier: {
        Args: { _business_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "super_admin" | "business_owner" | "staff"
      business_type:
        | "restaurant"
        | "cafe"
        | "lounge"
        | "villa"
        | "airbnb"
        | "guesthouse"
        | "hotel"
        | "home"
        | "hotspot_business"
        | "other"
        | "bnb"
        | "lodge"
        | "school"
        | "hospital"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["super_admin", "business_owner", "staff"],
      business_type: [
        "restaurant",
        "cafe",
        "lounge",
        "villa",
        "airbnb",
        "guesthouse",
        "hotel",
        "home",
        "hotspot_business",
        "other",
        "bnb",
        "lodge",
        "school",
        "hospital",
      ],
    },
  },
} as const
