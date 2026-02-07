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
      attendance: {
        Row: {
          check_in_at: string
          created_at: string
          gym_id: string
          id: string
          member_id: string
          notes: string | null
          source: Database["public"]["Enums"]["attendance_source"]
        }
        Insert: {
          check_in_at?: string
          created_at?: string
          gym_id: string
          id?: string
          member_id: string
          notes?: string | null
          source?: Database["public"]["Enums"]["attendance_source"]
        }
        Update: {
          check_in_at?: string
          created_at?: string
          gym_id?: string
          id?: string
          member_id?: string
          notes?: string | null
          source?: Database["public"]["Enums"]["attendance_source"]
        }
        Relationships: [
          {
            foreignKeyName: "attendance_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_goals: {
        Row: {
          created_at: string
          goal_type: string
          gym_id: string
          id: string
          is_active: boolean
          member_id: string
          target_visits: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          goal_type?: string
          gym_id: string
          id?: string
          is_active?: boolean
          member_id: string
          target_visits?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          goal_type?: string
          gym_id?: string
          id?: string
          is_active?: boolean
          member_id?: string
          target_visits?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_goals_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_goals_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          gym_id: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          gym_id?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          gym_id?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      body_measurements: {
        Row: {
          bicep_cm: number | null
          body_fat_percent: number | null
          chest_cm: number | null
          created_at: string
          gym_id: string
          height_cm: number | null
          hips_cm: number | null
          id: string
          measured_at: string
          member_id: string
          notes: string | null
          thigh_cm: number | null
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          bicep_cm?: number | null
          body_fat_percent?: number | null
          chest_cm?: number | null
          created_at?: string
          gym_id: string
          height_cm?: number | null
          hips_cm?: number | null
          id?: string
          measured_at?: string
          member_id: string
          notes?: string | null
          thigh_cm?: number | null
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          bicep_cm?: number | null
          body_fat_percent?: number | null
          chest_cm?: number | null
          created_at?: string
          gym_id?: string
          height_cm?: number | null
          hips_cm?: number | null
          id?: string
          measured_at?: string
          member_id?: string
          notes?: string | null
          thigh_cm?: number | null
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_measurements_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "body_measurements_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_read_receipts: {
        Row: {
          id: string
          member_id: string
          message_id: string
          read_at: string
        }
        Insert: {
          id?: string
          member_id: string
          message_id: string
          read_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          message_id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_read_receipts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "gym_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      class_bookings: {
        Row: {
          booked_at: string
          cancelled_at: string | null
          gym_id: string
          id: string
          member_id: string
          schedule_id: string
          status: string
        }
        Insert: {
          booked_at?: string
          cancelled_at?: string | null
          gym_id: string
          id?: string
          member_id: string
          schedule_id: string
          status?: string
        }
        Update: {
          booked_at?: string
          cancelled_at?: string | null
          gym_id?: string
          id?: string
          member_id?: string
          schedule_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_bookings_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_bookings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_bookings_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "class_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedules: {
        Row: {
          class_id: string
          created_at: string
          gym_id: string
          id: string
          is_cancelled: boolean
          notes: string | null
          scheduled_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          gym_id: string
          id?: string
          is_cancelled?: boolean
          notes?: string | null
          scheduled_at: string
        }
        Update: {
          class_id?: string
          created_at?: string
          gym_id?: string
          id?: string
          is_cancelled?: boolean
          notes?: string | null
          scheduled_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "gym_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_schedules_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          gym_id: string
          id: string
          receipt_url: string | null
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          gym_id: string
          id?: string
          receipt_url?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          gym_id?: string
          id?: string
          receipt_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      fingerprint_devices: {
        Row: {
          api_key: string
          created_at: string
          device_ip: string | null
          device_name: string
          device_serial: string
          gym_id: string
          id: string
          is_active: boolean
          last_seen_at: string | null
          updated_at: string
        }
        Insert: {
          api_key?: string
          created_at?: string
          device_ip?: string | null
          device_name: string
          device_serial: string
          gym_id: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          device_ip?: string | null
          device_name?: string
          device_serial?: string
          gym_id?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fingerprint_devices_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      fingerprint_templates: {
        Row: {
          created_at: string
          device_id: string | null
          fingerprint_uid: string
          gym_id: string
          id: string
          member_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          fingerprint_uid: string
          gym_id: string
          id?: string
          member_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          fingerprint_uid?: string
          gym_id?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fingerprint_templates_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "fingerprint_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fingerprint_templates_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fingerprint_templates_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          gym_id: string
          id: string
          is_published: boolean
          priority: string
          publish_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          gym_id: string
          id?: string
          is_published?: boolean
          priority?: string
          publish_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          gym_id?: string
          id?: string
          is_published?: boolean
          priority?: string
          publish_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_announcements_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_chat_messages: {
        Row: {
          content: string
          created_at: string
          gym_id: string
          id: string
          is_pinned: boolean
          message_type: string
          metadata: Json | null
          sender_id: string
          sender_name: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          gym_id: string
          id?: string
          is_pinned?: boolean
          message_type?: string
          metadata?: Json | null
          sender_id: string
          sender_name: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          gym_id?: string
          id?: string
          is_pinned?: boolean
          message_type?: string
          metadata?: Json | null
          sender_id?: string
          sender_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_chat_messages_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_classes: {
        Row: {
          capacity: number
          created_at: string
          description: string | null
          duration_minutes: number
          gym_id: string
          id: string
          instructor_name: string | null
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          description?: string | null
          duration_minutes?: number
          gym_id: string
          id?: string
          instructor_name?: string | null
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          description?: string | null
          duration_minutes?: number
          gym_id?: string
          id?: string
          instructor_name?: string | null
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_classes_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_staff: {
        Row: {
          created_at: string
          gym_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gym_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gym_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_staff_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          address: string | null
          brand_id: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          features_locked: Json | null
          id: string
          is_active: boolean
          logo_url: string | null
          member_limit: number
          name: string
          owner_id: string
          phone: string | null
          plan: Database["public"]["Enums"]["gym_plan"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          brand_id?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          features_locked?: Json | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          member_limit?: number
          name: string
          owner_id: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["gym_plan"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          brand_id?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          features_locked?: Json | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          member_limit?: number
          name?: string
          owner_id?: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["gym_plan"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gyms_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          created_at: string
          created_by: string | null
          error_details: Json | null
          failure_count: number
          file_name: string
          file_type: string
          gym_id: string
          id: string
          plans_created: number
          success_count: number
          total_rows: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error_details?: Json | null
          failure_count?: number
          file_name: string
          file_type?: string
          gym_id: string
          id?: string
          plans_created?: number
          success_count?: number
          total_rows?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error_details?: Json | null
          failure_count?: number
          file_name?: string
          file_type?: string
          gym_id?: string
          id?: string
          plans_created?: number
          success_count?: number
          total_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          block_reason: string | null
          created_at: string
          custom_price: number | null
          deleted_at: string | null
          email: string | null
          expiry_date: string
          full_name: string
          gym_id: string
          id: string
          is_blocked: boolean
          last_visit_at: string | null
          member_id: string
          notes: string | null
          phone: string
          pin_hash: string | null
          plan_id: string | null
          plan_name: string | null
          portal_token: string | null
          portal_token_expires_at: string | null
          qr_token: string
          start_date: string
          status: Database["public"]["Enums"]["member_status"]
          total_visits: number
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          block_reason?: string | null
          created_at?: string
          custom_price?: number | null
          deleted_at?: string | null
          email?: string | null
          expiry_date: string
          full_name: string
          gym_id: string
          id?: string
          is_blocked?: boolean
          last_visit_at?: string | null
          member_id?: string
          notes?: string | null
          phone: string
          pin_hash?: string | null
          plan_id?: string | null
          plan_name?: string | null
          portal_token?: string | null
          portal_token_expires_at?: string | null
          qr_token?: string
          start_date?: string
          status?: Database["public"]["Enums"]["member_status"]
          total_visits?: number
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          block_reason?: string | null
          created_at?: string
          custom_price?: number | null
          deleted_at?: string | null
          email?: string | null
          expiry_date?: string
          full_name?: string
          gym_id?: string
          id?: string
          is_blocked?: boolean
          last_visit_at?: string | null
          member_id?: string
          notes?: string | null
          phone?: string
          pin_hash?: string | null
          plan_id?: string | null
          plan_name?: string | null
          portal_token?: string | null
          portal_token_expires_at?: string | null
          qr_token?: string
          start_date?: string
          status?: Database["public"]["Enums"]["member_status"]
          total_visits?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number
          gym_id: string
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days?: number
          gym_id: string
          id?: string
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number
          gym_id?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          body: string
          gym_id: string
          id: string
          member_id: string
          notification_type: string
          sent_at: string
          status: string
          title: string
        }
        Insert: {
          body: string
          gym_id: string
          id?: string
          member_id: string
          notification_type: string
          sent_at?: string
          status?: string
          title: string
        }
        Update: {
          body?: string
          gym_id?: string
          id?: string
          member_id?: string
          notification_type?: string
          sent_at?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          gym_id: string
          id: string
          member_id: string
          new_expiry_date: string | null
          new_start_date: string | null
          notes: string | null
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          plan_id: string | null
          plan_name: string | null
          status: Database["public"]["Enums"]["payment_status"]
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          gym_id: string
          id?: string
          member_id: string
          new_expiry_date?: string | null
          new_start_date?: string | null
          notes?: string | null
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          plan_id?: string | null
          plan_name?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          gym_id?: string
          id?: string
          member_id?: string
          new_expiry_date?: string | null
          new_start_date?: string | null
          notes?: string | null
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          plan_id?: string | null
          plan_name?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_limits: {
        Row: {
          has_advanced_analytics: boolean
          has_automated_alerts: boolean
          has_expense_tracking: boolean
          has_multi_branch: boolean
          has_staff_management: boolean
          member_limit: number
          plan: Database["public"]["Enums"]["gym_plan"]
        }
        Insert: {
          has_advanced_analytics?: boolean
          has_automated_alerts?: boolean
          has_expense_tracking?: boolean
          has_multi_branch?: boolean
          has_staff_management?: boolean
          member_limit: number
          plan: Database["public"]["Enums"]["gym_plan"]
        }
        Update: {
          has_advanced_analytics?: boolean
          has_automated_alerts?: boolean
          has_expense_tracking?: boolean
          has_multi_branch?: boolean
          has_staff_management?: boolean
          member_limit?: number
          plan?: Database["public"]["Enums"]["gym_plan"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          gym_id: string
          id: string
          is_active: boolean
          member_id: string
          p256dh: string
          updated_at: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          gym_id: string
          id?: string
          is_active?: boolean
          member_id: string
          p256dh: string
          updated_at?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          gym_id?: string
          id?: string
          is_active?: boolean
          member_id?: string
          p256dh?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_requests: {
        Row: {
          admin_response: string | null
          created_at: string
          gym_id: string
          id: string
          member_id: string
          message: string | null
          preferred_plan_id: string | null
          responded_at: string | null
          responded_by: string | null
          status: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          gym_id: string
          id?: string
          member_id: string
          message?: string | null
          preferred_plan_id?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          gym_id?: string
          id?: string
          member_id?: string
          message?: string | null
          preferred_plan_id?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_requests_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_requests_preferred_plan_id_fkey"
            columns: ["preferred_plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          admin_reply: string | null
          created_at: string
          gym_id: string
          id: string
          member_id: string
          message: string
          replied_at: string | null
          replied_by: string | null
          status: string
          subject: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          gym_id: string
          id?: string
          member_id: string
          message: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          gym_id?: string
          id?: string
          member_id?: string
          message?: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_logs: {
        Row: {
          created_at: string
          error_message: string | null
          gym_id: string
          id: string
          member_id: string
          payload: Json | null
          phone: string | null
          response_body: Json | null
          response_status: number | null
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          gym_id: string
          id?: string
          member_id: string
          payload?: Json | null
          phone?: string | null
          response_body?: Json | null
          response_status?: number | null
          status?: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          gym_id?: string
          id?: string
          member_id?: string
          payload?: Json | null
          phone?: string | null
          response_body?: Json | null
          response_status?: number | null
          status?: string
          template_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_rate_limits: {
        Row: {
          date: string
          gym_id: string
          id: string
          message_count: number
        }
        Insert: {
          date?: string
          gym_id: string
          id?: string
          message_count?: number
        }
        Update: {
          date?: string
          gym_id?: string
          id?: string
          message_count?: number
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          created_at: string
          exercise_name: string
          id: string
          notes: string | null
          order_index: number
          reps: number | null
          session_id: string
          sets: number
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          exercise_name: string
          id?: string
          notes?: string | null
          order_index?: number
          reps?: number | null
          session_id: string
          sets?: number
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          exercise_name?: string
          id?: string
          notes?: string | null
          order_index?: number
          reps?: number | null
          session_id?: string
          sets?: number
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          gym_id: string
          id: string
          member_id: string
          name: string
          notes: string | null
          session_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          gym_id: string
          id?: string
          member_id: string
          name?: string
          notes?: string | null
          session_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          gym_id?: string
          id?: string
          member_id?: string
          name?: string
          notes?: string | null
          session_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_assign_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      admin_create_gym: {
        Args: {
          _address?: string
          _city?: string
          _name: string
          _owner_email: string
          _phone?: string
          _plan?: Database["public"]["Enums"]["gym_plan"]
        }
        Returns: string
      }
      check_gym_member_limit: { Args: { _gym_id: string }; Returns: boolean }
      generate_member_id: { Args: { _gym_id: string }; Returns: string }
      generate_portal_token: { Args: never; Returns: string }
      generate_qr_token: { Args: never; Returns: string }
      get_brand_analytics: {
        Args: { _brand_id: string }
        Returns: {
          active_members: number
          monthly_revenue: number
          today_attendance: number
          total_gyms: number
          total_members: number
          total_revenue: number
        }[]
      }
      get_brand_branch_stats: {
        Args: { _brand_id: string }
        Returns: {
          active_members: number
          city: string
          gym_id: string
          gym_name: string
          monthly_revenue: number
          today_attendance: number
          total_members: number
        }[]
      }
      get_brand_gyms: {
        Args: { _brand_id: string }
        Returns: {
          address: string | null
          brand_id: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          features_locked: Json | null
          id: string
          is_active: boolean
          logo_url: string | null
          member_limit: number
          name: string
          owner_id: string
          phone: string | null
          plan: Database["public"]["Enums"]["gym_plan"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "gyms"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_daily_attendance: {
        Args: { _days_back?: number; _gym_id: string }
        Returns: {
          check_ins: number
          date: string
        }[]
      }
      get_expiring_members: {
        Args: { _days_ahead?: number; _gym_id: string }
        Returns: {
          days_remaining: number
          email: string
          expiry_date: string
          full_name: string
          id: string
          member_id: string
          phone: string
          plan_name: string
        }[]
      }
      get_gym_dashboard_stats: {
        Args: { _gym_id: string }
        Returns: {
          active_members: number
          expired_members: number
          expiring_soon_members: number
          monthly_expenses: number
          monthly_revenue: number
          net_profit: number
          today_attendance: number
          total_members: number
        }[]
      }
      get_member_by_auth_user: {
        Args: { _user_id: string }
        Returns: {
          auth_user_id: string | null
          avatar_url: string | null
          block_reason: string | null
          created_at: string
          custom_price: number | null
          deleted_at: string | null
          email: string | null
          expiry_date: string
          full_name: string
          gym_id: string
          id: string
          is_blocked: boolean
          last_visit_at: string | null
          member_id: string
          notes: string | null
          phone: string
          pin_hash: string | null
          plan_id: string | null
          plan_name: string | null
          portal_token: string | null
          portal_token_expires_at: string | null
          qr_token: string
          start_date: string
          status: Database["public"]["Enums"]["member_status"]
          total_visits: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_monthly_expenses: {
        Args: { _gym_id: string; _months_back?: number }
        Returns: {
          category: Database["public"]["Enums"]["expense_category"]
          expense_count: number
          month: string
          total_amount: number
        }[]
      }
      get_monthly_revenue: {
        Args: { _gym_id: string; _months_back?: number }
        Returns: {
          month: string
          payment_count: number
          total_revenue: number
        }[]
      }
      get_retention_stats: {
        Args: { _gym_id: string }
        Returns: {
          active_members: number
          avg_membership_duration: number
          members_churned_this_month: number
          members_renewed_this_month: number
          retention_rate: number
          total_members: number
        }[]
      }
      get_user_gym_id: { Args: { _user_id: string }; Returns: string }
      has_gym_access: {
        Args: { _gym_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      ingest_attendance: {
        Args: { _gym_id?: string; _qr_token: string }
        Returns: Json
      }
      ingest_fingerprint_attendance: {
        Args: { _api_key: string; _fingerprint_uid: string }
        Returns: Json
      }
      is_gym_staff: {
        Args: { _gym_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      owns_gym: {
        Args: { _gym_id: string; _user_id: string }
        Returns: boolean
      }
      register_fingerprint_template: {
        Args: {
          _device_id?: string
          _fingerprint_uid: string
          _member_id: string
        }
        Returns: Json
      }
      renew_membership: {
        Args: {
          _amount?: number
          _duration_days?: number
          _member_id: string
          _notes?: string
          _payment_mode?: Database["public"]["Enums"]["payment_mode"]
          _plan_id?: string
        }
        Returns: Json
      }
      set_member_pin: { Args: { _pin: string; _token: string }; Returns: Json }
      validate_portal_token: { Args: { _token: string }; Returns: Json }
      verify_member_pin: {
        Args: { _email: string; _pin: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "super_admin" | "gym_owner" | "staff"
      attendance_source: "qr" | "manual" | "fingerprint"
      expense_category:
        | "rent"
        | "salary"
        | "electricity"
        | "maintenance"
        | "other"
      gym_plan: "lite" | "standard" | "pro"
      member_status: "active" | "expiring_soon" | "expired" | "blocked"
      payment_mode: "cash" | "upi" | "card"
      payment_status: "completed" | "pending" | "failed"
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
      app_role: ["super_admin", "gym_owner", "staff"],
      attendance_source: ["qr", "manual", "fingerprint"],
      expense_category: [
        "rent",
        "salary",
        "electricity",
        "maintenance",
        "other",
      ],
      gym_plan: ["lite", "standard", "pro"],
      member_status: ["active", "expiring_soon", "expired", "blocked"],
      payment_mode: ["cash", "upi", "card"],
      payment_status: ["completed", "pending", "failed"],
    },
  },
} as const
