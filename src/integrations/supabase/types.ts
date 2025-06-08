export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_read_status: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          last_read_at: string
          requirement_id: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          requirement_id: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          requirement_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_read_status_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      client_read_status: {
        Row: {
          client_id: string
          created_at: string
          id: string
          last_read_at: string
          requirement_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          requirement_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          requirement_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_read_status_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notifications: {
        Row: {
          created_at: string
          email_sent_to: string
          id: string
          reference_id: string
          sent_at: string
          type: string
        }
        Insert: {
          created_at?: string
          email_sent_to: string
          id?: string
          reference_id: string
          sent_at?: string
          type: string
        }
        Update: {
          created_at?: string
          email_sent_to?: string
          id?: string
          reference_id?: string
          sent_at?: string
          type?: string
        }
        Relationships: []
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          message_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          message_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          message_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_admin: boolean | null
          requirement_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_admin?: boolean | null
          requirement_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_admin?: boolean | null
          requirement_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string
          created_at: string
          id: string
          updated_at: string
          website_url: string
        }
        Insert: {
          company_name: string
          created_at?: string
          id: string
          updated_at?: string
          website_url: string
        }
        Update: {
          company_name?: string
          created_at?: string
          id?: string
          updated_at?: string
          website_url?: string
        }
        Relationships: []
      }
      requirements: {
        Row: {
          acceptance_date: string | null
          accepted_by_client: boolean | null
          admin_response_to_rejection: string | null
          approval_date: string | null
          approved_by_admin: boolean | null
          approved_by_admin_id: string | null
          attachment_metadata: Json | null
          attachment_urls: string[] | null
          completed_by_admin: boolean | null
          completion_date: string | null
          created_at: string
          description: string
          has_screen_recording: boolean | null
          id: string
          priority: string
          rejected_by_client: boolean | null
          rejection_reason: string | null
          screen_recording_url: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acceptance_date?: string | null
          accepted_by_client?: boolean | null
          admin_response_to_rejection?: string | null
          approval_date?: string | null
          approved_by_admin?: boolean | null
          approved_by_admin_id?: string | null
          attachment_metadata?: Json | null
          attachment_urls?: string[] | null
          completed_by_admin?: boolean | null
          completion_date?: string | null
          created_at?: string
          description: string
          has_screen_recording?: boolean | null
          id?: string
          priority: string
          rejected_by_client?: boolean | null
          rejection_reason?: string | null
          screen_recording_url?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acceptance_date?: string | null
          accepted_by_client?: boolean | null
          admin_response_to_rejection?: string | null
          approval_date?: string | null
          approved_by_admin?: boolean | null
          approved_by_admin_id?: string | null
          attachment_metadata?: Json | null
          attachment_urls?: string[] | null
          completed_by_admin?: boolean | null
          completion_date?: string | null
          created_at?: string
          description?: string
          has_screen_recording?: boolean | null
          id?: string
          priority?: string
          rejected_by_client?: boolean | null
          rejection_reason?: string | null
          screen_recording_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_unread_counts_for_admin: {
        Args: { admin_user_id: string }
        Returns: {
          requirement_id: string
          unread_count: number
        }[]
      }
      get_unread_counts_for_client: {
        Args: { client_user_id: string }
        Returns: {
          requirement_id: string
          unread_count: number
        }[]
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      mark_requirement_as_read: {
        Args: { admin_user_id: string; req_id: string }
        Returns: undefined
      }
      mark_requirement_as_read_for_client: {
        Args: { client_user_id: string; req_id: string }
        Returns: undefined
      }
      send_email_notification: {
        Args: {
          notification_type: string
          reference_id: string
          email_to?: string
        }
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
