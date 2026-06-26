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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          api_key: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          label: string
          last_used: string | null
          provider: string
          tier: string
        }
        Insert: {
          api_key: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          label?: string
          last_used?: string | null
          provider: string
          tier?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          label?: string
          last_used?: string | null
          provider?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          base_cover_letter: string
          created_at: string
          id: string
          is_active: boolean | null
          keywords: string[]
          location: string
          user_id: string
          work_types: string[]
        }
        Insert: {
          base_cover_letter: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          keywords: string[]
          location: string
          user_id: string
          work_types: string[]
        }
        Update: {
          base_cover_letter?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          keywords?: string[]
          location?: string
          user_id?: string
          work_types?: string[]
        }
        Relationships: []
      }
      certifications: {
        Row: {
          file_name: string
          file_size_kb: number | null
          file_type: string
          id: string
          storage_path: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          file_name: string
          file_size_kb?: number | null
          file_type?: string
          id?: string
          storage_path: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          file_name?: string
          file_size_kb?: number | null
          file_type?: string
          id?: string
          storage_path?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cover_letters: {
        Row: {
          automation_rule_id: string | null
          body: string
          company: string | null
          created_at: string
          generated_by: string
          id: string
          is_default: boolean
          job_title: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          automation_rule_id?: string | null
          body: string
          company?: string | null
          created_at?: string
          generated_by?: string
          id?: string
          is_default?: boolean
          job_title?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          automation_rule_id?: string | null
          body?: string
          company?: string | null
          created_at?: string
          generated_by?: string
          id?: string
          is_default?: boolean
          job_title?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_letters_automation_rule_id_fkey"
            columns: ["automation_rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cover_letters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applied_at: string | null
          cover_letter_used: string | null
          created_at: string
          id: string
          job_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          cover_letter_used?: string | null
          created_at?: string
          id?: string
          job_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          cover_letter_used?: string | null
          created_at?: string
          id?: string
          job_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_vault"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_vault: {
        Row: {
          company: string
          created_at: string
          description: string | null
          external_job_id: string
          id: string
          location: string | null
          match_score: number | null
          salary: string | null
          source_url: string
          status: Database["public"]["Enums"]["job_status"]
          tech_stack: string[]
          title: string
          url: string
          user_id: string
        }
        Insert: {
          company: string
          created_at?: string
          description?: string | null
          external_job_id: string
          id?: string
          location?: string | null
          match_score?: number | null
          salary?: string | null
          source_url?: string
          status?: Database["public"]["Enums"]["job_status"]
          tech_stack?: string[]
          title: string
          url: string
          user_id: string
        }
        Update: {
          company?: string
          created_at?: string
          description?: string | null
          external_job_id?: string
          id?: string
          location?: string | null
          match_score?: number | null
          salary?: string | null
          source_url?: string
          status?: Database["public"]["Enums"]["job_status"]
          tech_stack?: string[]
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_vault_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          cv_storage_path: string | null
          email: string
          full_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cv_storage_path?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cv_storage_path?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_pipeline_metrics: { Args: never; Returns: Json }
    }
    Enums: {
      job_status: "pending" | "approved" | "rejected" | "applied"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      job_status: ["pending", "approved", "rejected", "applied"],
    },
  },
} as const
