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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_sessions: {
        Row: {
          admin_id: string
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          session_token: string
          user_agent: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          session_token: string
          user_agent?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          session_token?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          email: string
          id: string
          last_login_at: string | null
          name: string
          password_hash: string
          role: Database["public"]["Enums"]["admin_role"]
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_login_at?: string | null
          name: string
          password_hash: string
          role?: Database["public"]["Enums"]["admin_role"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_login_at?: string | null
          name?: string
          password_hash?: string
          role?: Database["public"]["Enums"]["admin_role"]
        }
        Relationships: []
      }
      container_entries: {
        Row: {
          container_image: string | null
          container_number: string
          container_size: string
          created_at: string
          deletion_requested: boolean | null
          deletion_requested_at: string | null
          deletion_requested_by: string | null
          entry_type: string
          id: string
          license_plate_number: string | null
          second_container_number: string | null
          user_id: string | null
          user_name: string
        }
        Insert: {
          container_image?: string | null
          container_number: string
          container_size: string
          created_at?: string
          deletion_requested?: boolean | null
          deletion_requested_at?: string | null
          deletion_requested_by?: string | null
          entry_type?: string
          id?: string
          license_plate_number?: string | null
          second_container_number?: string | null
          user_id?: string | null
          user_name?: string
        }
        Update: {
          container_image?: string | null
          container_number?: string
          container_size?: string
          created_at?: string
          deletion_requested?: boolean | null
          deletion_requested_at?: string | null
          deletion_requested_by?: string | null
          entry_type?: string
          id?: string
          license_plate_number?: string | null
          second_container_number?: string | null
          user_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "container_entries_deletion_requested_by_fkey"
            columns: ["deletion_requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          code: string | null
          created_at: string
          id: string
          last_seen_at: string
          name: string
          phone_number: string | null
          recovery_requested: boolean | null
          recovery_requested_at: string | null
          staff_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string
          name: string
          phone_number?: string | null
          recovery_requested?: boolean | null
          recovery_requested_at?: string | null
          staff_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string
          name?: string
          phone_number?: string | null
          recovery_requested?: boolean | null
          recovery_requested_at?: string | null
          staff_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_staff_id_available: {
        Args: { p_staff_id: string }
        Returns: boolean
      }
      complete_recovery:
        | {
            Args: { p_session_token: string; p_user_id: string }
            Returns: boolean
          }
        | { Args: { user_id: string }; Returns: boolean }
      confirm_entry_deletion:
        | { Args: { entry_id: string }; Returns: boolean }
        | {
            Args: { p_entry_id: string; p_session_token: string }
            Returns: boolean
          }
      create_admin_session: {
        Args: {
          p_admin_id: string
          p_expires_at: string
          p_ip_address?: string
          p_session_token: string
          p_user_agent?: string
        }
        Returns: boolean
      }
      create_admin_user: {
        Args: {
          admin_email: string
          admin_name: string
          admin_password: string
          admin_role?: Database["public"]["Enums"]["admin_role"]
        }
        Returns: string
      }
      create_container_entry: {
        Args: {
          p_container_image?: string
          p_container_number: string
          p_container_size: string
          p_entry_type: string
          p_license_plate_number?: string
          p_second_container_number?: string
          p_session_token: string
        }
        Returns: string
      }
      create_user_account: {
        Args: {
          p_code: string
          p_name: string
          p_phone_number: string
          p_staff_id: string
        }
        Returns: {
          user_code: string
          user_id: string
          user_name: string
        }[]
      }
      create_user_session: {
        Args: {
          p_expires_at: string
          p_ip_address?: string
          p_session_token: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: boolean
      }
      get_deletion_requests:
        | {
            Args: never
            Returns: {
              container_number: string
              container_size: string
              created_at: string
              deletion_requested_at: string
              entry_type: string
              id: string
              second_container_number: string
              user_name: string
            }[]
          }
        | {
            Args: { p_session_token: string }
            Returns: {
              container_number: string
              container_size: string
              created_at: string
              deletion_reason: string
              deletion_requested_at: string
              entry_type: string
              id: string
              second_container_number: string
              user_name: string
            }[]
          }
      get_recovery_requests:
        | {
            Args: never
            Returns: {
              code: string
              id: string
              name: string
              phone_number: string
              recovery_requested_at: string
              staff_id: string
            }[]
          }
        | {
            Args: { p_session_token: string }
            Returns: {
              code: string
              id: string
              name: string
              phone_number: string
              recovery_requested_at: string
              staff_id: string
            }[]
          }
      get_user_entries: {
        Args: { p_session_token: string }
        Returns: {
          container_image: string
          container_number: string
          container_size: string
          created_at: string
          deletion_requested: boolean
          deletion_requested_at: string
          entry_type: string
          id: string
          license_plate_number: string
          second_container_number: string
          user_id: string
          user_name: string
        }[]
      }
      invalidate_admin_session: {
        Args: { p_session_token: string }
        Returns: boolean
      }
      invalidate_user_session: {
        Args: { p_session_token: string }
        Returns: boolean
      }
      reject_deletion_request:
        | { Args: { entry_id: string }; Returns: boolean }
        | {
            Args: { p_entry_id: string; p_session_token: string }
            Returns: boolean
          }
      request_entry_deletion: {
        Args: { p_entry_id: string; p_session_token: string }
        Returns: boolean
      }
      request_recovery: { Args: { p_staff_id: string }; Returns: boolean }
      update_container_entry: {
        Args: {
          p_container_number?: string
          p_container_size?: string
          p_entry_id: string
          p_entry_type?: string
          p_license_plate_number?: string
          p_second_container_number?: string
          p_session_token: string
        }
        Returns: boolean
      }
      update_user_last_seen: { Args: { p_user_id: string }; Returns: boolean }
      validate_admin_session: {
        Args: { session_token: string }
        Returns: {
          admin_email: string
          admin_id: string
          admin_name: string
          admin_role: Database["public"]["Enums"]["admin_role"]
        }[]
      }
      validate_user_session: {
        Args: { p_session_token: string }
        Returns: {
          user_id: string
          user_name: string
          user_staff_id: string
        }[]
      }
      verify_admin_login: {
        Args: { admin_email: string; admin_password: string }
        Returns: {
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["admin_role"]
        }[]
      }
      verify_user_login: {
        Args: { p_code: string; p_name: string }
        Returns: {
          user_id: string
          user_name: string
          user_staff_id: string
        }[]
      }
    }
    Enums: {
      admin_role: "admin" | "super_admin"
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
      admin_role: ["admin", "super_admin"],
    },
  },
} as const
