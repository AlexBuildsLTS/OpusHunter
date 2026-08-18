export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      api_keys: {
        Row: {
          api_key: string;
          created_at: string;
          created_by: string | null;
          id: string;
          is_active: boolean;
          label: string;
          last_used: string | null;
          provider: string;
          tier: string;
        };
        Insert: {
          api_key: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          label?: string;
          last_used?: string | null;
          provider: string;
          tier?: string;
        };
        Update: {
          api_key?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          label?: string;
          last_used?: string | null;
          provider?: string;
          tier?: string;
        };
        Relationships: [];
      };
      automation_rules: {
        Row: {
          base_cover_letter: string;
          created_at: string;
          experience_levels: string[];
          id: string;
          is_active: boolean | null;
          keywords: string[];
          latitude: number | null;
          location: string;
          longitude: number | null;
          max_distance_km: number | null;
          remote_preference: string;
          salary_min: number | null;
          user_id: string;
          work_types: string[];
        };
        Insert: {
          base_cover_letter: string;
          created_at?: string;
          experience_levels?: string[];
          id?: string;
          is_active?: boolean | null;
          keywords: string[];
          latitude?: number | null;
          location: string;
          longitude?: number | null;
          max_distance_km?: number | null;
          remote_preference?: string;
          salary_min?: number | null;
          user_id: string;
          work_types: string[];
        };
        Update: {
          base_cover_letter?: string;
          created_at?: string;
          experience_levels?: string[];
          id?: string;
          is_active?: boolean | null;
          keywords?: string[];
          latitude?: number | null;
          location?: string;
          longitude?: number | null;
          max_distance_km?: number | null;
          remote_preference?: string;
          salary_min?: number | null;
          user_id?: string;
          work_types?: string[];
        };
        Relationships: [];
      };
      certifications: {
        Row: {
          file_name: string;
          file_size_kb: number | null;
          file_type: string;
          id: string;
          storage_path: string;
          uploaded_at: string;
          user_id: string;
        };
        Insert: {
          file_name: string;
          file_size_kb?: number | null;
          file_type?: string;
          id?: string;
          storage_path: string;
          uploaded_at?: string;
          user_id: string;
        };
        Update: {
          file_name?: string;
          file_size_kb?: number | null;
          file_type?: string;
          id?: string;
          storage_path?: string;
          uploaded_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      connected_email_accounts: {
        Row: {
          connected_at: string;
          created_at: string;
          email: string;
          id: string;
          is_primary_sender: boolean;
          provider: string;
          refresh_token: string;
          scopes: string[];
          user_id: string;
        };
        Insert: {
          connected_at?: string;
          created_at?: string;
          email: string;
          id?: string;
          is_primary_sender?: boolean;
          provider?: string;
          refresh_token: string;
          scopes?: string[];
          user_id: string;
        };
        Update: {
          connected_at?: string;
          created_at?: string;
          email?: string;
          id?: string;
          is_primary_sender?: boolean;
          provider?: string;
          refresh_token?: string;
          scopes?: string[];
          user_id?: string;
        };
        Relationships: [];
      };
      cover_letters: {
        Row: {
          automation_rule_id: string | null;
          body: string;
          company: string | null;
          created_at: string;
          generated_by: string;
          id: string;
          is_default: boolean;
          job_title: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          automation_rule_id?: string | null;
          body: string;
          company?: string | null;
          created_at?: string;
          generated_by?: string;
          id?: string;
          is_default?: boolean;
          job_title?: string | null;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          automation_rule_id?: string | null;
          body?: string;
          company?: string | null;
          created_at?: string;
          generated_by?: string;
          id?: string;
          is_default?: boolean;
          job_title?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cover_letters_automation_rule_id_fkey";
            columns: ["automation_rule_id"];
            isOneToOne: false;
            referencedRelation: "automation_rules";
            referencedColumns: ["id"];
          },
        ];
      };
      interview_preps: {
        Row: {
          brief_markdown: string;
          generated_at: string;
          id: string;
          job_id: string;
          user_id: string;
        };
        Insert: {
          brief_markdown: string;
          generated_at?: string;
          id?: string;
          job_id: string;
          user_id: string;
        };
        Update: {
          brief_markdown?: string;
          generated_at?: string;
          id?: string;
          job_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interview_preps_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "job_vault";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interview_preps_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_applications: {
        Row: {
          applied_at: string | null;
          ats_provider: string | null;
          cover_letter_used: string | null;
          created_at: string;
          id: string;
          job_id: string;
          status: string;
          submission_confirmation: string | null;
          submission_error: string | null;
          submission_method: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          applied_at?: string | null;
          ats_provider?: string | null;
          cover_letter_used?: string | null;
          created_at?: string;
          id?: string;
          job_id: string;
          status?: string;
          submission_confirmation?: string | null;
          submission_error?: string | null;
          submission_method?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          applied_at?: string | null;
          ats_provider?: string | null;
          cover_letter_used?: string | null;
          created_at?: string;
          id?: string;
          job_id?: string;
          status?: string;
          submission_confirmation?: string | null;
          submission_error?: string | null;
          submission_method?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "job_vault";
            referencedColumns: ["id"];
          },
        ];
      };
      job_vault: {
        Row: {
          company: string;
          country_code: string | null;
          created_at: string;
          description: string | null;
          external_job_id: string;
          id: string;
          is_remote: boolean;
          latitude: number | null;
          location: string | null;
          longitude: number | null;
          match_score: number | null;
          salary: string | null;
          source_url: string;
          status: Database["public"]["Enums"]["job_status"];
          tech_stack: string[];
          title: string;
          url: string;
          user_id: string;
        };
        Insert: {
          company: string;
          country_code?: string | null;
          created_at?: string;
          description?: string | null;
          external_job_id: string;
          id?: string;
          is_remote?: boolean;
          latitude?: number | null;
          location?: string | null;
          longitude?: number | null;
          match_score?: number | null;
          salary?: string | null;
          source_url?: string;
          status?: Database["public"]["Enums"]["job_status"];
          tech_stack?: string[];
          title: string;
          url: string;
          user_id: string;
        };
        Update: {
          company?: string;
          country_code?: string | null;
          created_at?: string;
          description?: string | null;
          external_job_id?: string;
          id?: string;
          is_remote?: boolean;
          latitude?: number | null;
          location?: string | null;
          longitude?: number | null;
          match_score?: number | null;
          salary?: string | null;
          source_url?: string;
          status?: Database["public"]["Enums"]["job_status"];
          tech_stack?: string[];
          title?: string;
          url?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          country_code: string | null;
          created_at: string;
          cv_storage_path: string | null;
          email: string;
          full_name: string | null;
          gemini_key: string | null;
          gemini_key_id: string | null;
          id: string;
          latitude: number | null;
          longitude: number | null;
          max_daily_applications: number;
          rapidapi_key: string | null;
          rapidapi_key_id: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          country_code?: string | null;
          created_at?: string;
          cv_storage_path?: string | null;
          email: string;
          full_name?: string | null;
          gemini_key?: string | null;
          gemini_key_id?: string | null;
          id: string;
          latitude?: number | null;
          longitude?: number | null;
          max_daily_applications?: number;
          rapidapi_key?: string | null;
          rapidapi_key_id?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          country_code?: string | null;
          created_at?: string;
          cv_storage_path?: string | null;
          email?: string;
          full_name?: string | null;
          gemini_key?: string | null;
          gemini_key_id?: string | null;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          max_daily_applications?: number;
          rapidapi_key?: string | null;
          rapidapi_key_id?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      usage_counters: {
        Row: {
          applications_count: number;
          counter_date: string;
          user_id: string;
        };
        Insert: {
          applications_count?: number;
          counter_date?: string;
          user_id: string;
        };
        Update: {
          applications_count?: number;
          counter_date?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usage_counters_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_delete_user: { Args: { target_id: string }; Returns: undefined };
      check_and_increment_daily_applications: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      clear_my_api_key: { Args: { p_provider: string }; Returns: undefined };
      force_set_role:
        | {
            Args: { target_email: string; target_role: string };
            Returns: undefined;
          }
        | {
            Args: {
              target_email: string;
              target_role: Database["public"]["Enums"]["user_role"];
            };
            Returns: undefined;
          };
      get_key_for_provider:
        | { Args: { p_provider: string; p_user_id: string }; Returns: string }
        | { Args: { p_provider: string; p_user_id: string }; Returns: string };
      get_my_connected_email_accounts: {
        Args: never;
        Returns: {
          connected_at: string;
          email: string;
          id: string;
          is_primary_sender: boolean;
          provider: string;
        }[];
      };
      get_user_pipeline_metrics: { Args: never; Returns: Json };
      is_admin: { Args: never; Returns: boolean };
      set_my_api_key: {
        Args: { p_key: string; p_provider: string };
        Returns: undefined;
      };
    };
    Enums: {
      ai_provider: "gemini" | "rapidapi";
      job_status: "pending" | "approved" | "rejected" | "applied";
      user_role: "member" | "premium" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ai_provider: ["gemini", "rapidapi"],
      job_status: ["pending", "approved", "rejected", "applied"],
      user_role: ["member", "premium", "admin"],
    },
  },
} as const;
