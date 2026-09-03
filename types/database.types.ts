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
    PostgrestVersion: "14.5";
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
      api_key_usage_logs: {
        Row: {
          cost_estimate_usd: number;
          created_at: string;
          error_code: string | null;
          function_name: string;
          id: string;
          key_source: Database["public"]["Enums"]["key_source_enum"];
          provider: Database["public"]["Enums"]["api_provider_enum"];
          status_code: number;
          strategy_used:
            Database["public"]["Enums"]["cover_letter_strategy_enum"] | null;
          success: boolean;
          tokens_used: number;
          user_id: string | null;
        };
        Insert: {
          cost_estimate_usd?: number;
          created_at?: string;
          error_code?: string | null;
          function_name: string;
          id?: string;
          key_source: Database["public"]["Enums"]["key_source_enum"];
          provider: Database["public"]["Enums"]["api_provider_enum"];
          status_code?: number;
          strategy_used?:
            Database["public"]["Enums"]["cover_letter_strategy_enum"] | null;
          success?: boolean;
          tokens_used?: number;
          user_id?: string | null;
        };
        Update: {
          cost_estimate_usd?: number;
          created_at?: string;
          error_code?: string | null;
          function_name?: string;
          id?: string;
          key_source?: Database["public"]["Enums"]["key_source_enum"];
          provider?: Database["public"]["Enums"]["api_provider_enum"];
          status_code?: number;
          strategy_used?:
            Database["public"]["Enums"]["cover_letter_strategy_enum"] | null;
          success?: boolean;
          tokens_used?: number;
          user_id?: string | null;
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
          user_id: string;
          work_types?: string[];
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
          cert_date: string | null;
          cert_issuer: string | null;
          cert_name: string | null;
          cert_tags: string[];
          file_name: string;
          file_size_kb: number | null;
          file_type: string;
          id: string;
          storage_path: string;
          uploaded_at: string;
          user_id: string;
        };
        Insert: {
          cert_date?: string | null;
          cert_issuer?: string | null;
          cert_name?: string | null;
          cert_tags?: string[];
          file_name: string;
          file_size_kb?: number | null;
          file_type?: string;
          id?: string;
          storage_path: string;
          uploaded_at?: string;
          user_id: string;
        };
        Update: {
          cert_date?: string | null;
          cert_issuer?: string | null;
          cert_name?: string | null;
          cert_tags?: string[];
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
          alternative_versions: Json;
          ats_score: number | null;
          automation_rule_id: string | null;
          body: string;
          company: string | null;
          created_at: string;
          filler_phrase_count: number;
          generated_by: string;
          generation_duration_ms: number | null;
          id: string;
          is_default: boolean;
          job_id: string | null;
          job_title: string | null;
          specificity_score: number | null;
          strategy_used:
            Database["public"]["Enums"]["cover_letter_strategy_enum"] | null;
          title: string;
          tokens_used: number | null;
          tone: string;
          updated_at: string;
          user_edited: boolean;
          user_id: string;
        };
        Insert: {
          alternative_versions?: Json;
          ats_score?: number | null;
          automation_rule_id?: string | null;
          body: string;
          company?: string | null;
          created_at?: string;
          filler_phrase_count?: number;
          generated_by?: string;
          generation_duration_ms?: number | null;
          id?: string;
          is_default?: boolean;
          job_id?: string | null;
          job_title?: string | null;
          specificity_score?: number | null;
          strategy_used?:
            Database["public"]["Enums"]["cover_letter_strategy_enum"] | null;
          title?: string;
          tokens_used?: number | null;
          tone?: string;
          updated_at?: string;
          user_edited?: boolean;
          user_id: string;
        };
        Update: {
          alternative_versions?: Json;
          ats_score?: number | null;
          automation_rule_id?: string | null;
          body?: string;
          company?: string | null;
          created_at?: string;
          filler_phrase_count?: number;
          generated_by?: string;
          generation_duration_ms?: number | null;
          id?: string;
          is_default?: boolean;
          job_id?: string | null;
          job_title?: string | null;
          specificity_score?: number | null;
          strategy_used?:
            Database["public"]["Enums"]["cover_letter_strategy_enum"] | null;
          title?: string;
          tokens_used?: number | null;
          tone?: string;
          updated_at?: string;
          user_edited?: boolean;
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
          {
            foreignKeyName: "cover_letters_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "job_vault";
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
          notes: string | null;
          resume_document_id: string | null;
          sender_email: string | null;
          sender_full_name: string | null;
          status: Database["public"]["Enums"]["application_status_enum"];
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
          notes?: string | null;
          resume_document_id?: string | null;
          sender_email?: string | null;
          sender_full_name?: string | null;
          status?: Database["public"]["Enums"]["application_status_enum"];
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
          notes?: string | null;
          resume_document_id?: string | null;
          sender_email?: string | null;
          sender_full_name?: string | null;
          status?: Database["public"]["Enums"]["application_status_enum"];
          submission_confirmation?: string | null;
          submission_error?: string | null;
          submission_method?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_applications_cover_letter_used_fkey";
            columns: ["cover_letter_used"];
            isOneToOne: false;
            referencedRelation: "cover_letters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_applications_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "job_vault";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_applications_resume_document_id_fkey";
            columns: ["resume_document_id"];
            isOneToOne: false;
            referencedRelation: "resume_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      job_vault: {
        Row: {
          company: string;
          company_logo_url: string | null;
          country_code: string | null;
          currency: string | null;
          dedup_hash: string;
          description: string | null;
          external_job_id: string;
          id: string;
          is_remote: boolean;
          latitude: number | null;
          location: string | null;
          longitude: number | null;
          match_score: number | null;
          posted_at: string | null;
          salary: string | null;
          salary_max: number | null;
          salary_min: number | null;
          scraped_at: string;
          source: Database["public"]["Enums"]["job_source_enum"];
          source_url: string;
          tech_stack: string[];
          title: string;
          url: string;
          user_id: string;
          work_type: Database["public"]["Enums"]["work_type_enum"] | null;
        };
        Insert: {
          company: string;
          company_logo_url?: string | null;
          country_code?: string | null;
          currency?: string | null;
          dedup_hash: string;
          description?: string | null;
          external_job_id: string;
          id?: string;
          is_remote?: boolean;
          latitude?: number | null;
          location?: string | null;
          longitude?: number | null;
          match_score?: number | null;
          posted_at?: string | null;
          salary?: string | null;
          salary_max?: number | null;
          salary_min?: number | null;
          scraped_at?: string;
          source: Database["public"]["Enums"]["job_source_enum"];
          source_url: string;
          tech_stack?: string[];
          title: string;
          url: string;
          user_id: string;
          work_type?: Database["public"]["Enums"]["work_type_enum"] | null;
        };
        Update: {
          company?: string;
          company_logo_url?: string | null;
          country_code?: string | null;
          currency?: string | null;
          dedup_hash?: string;
          description?: string | null;
          external_job_id?: string;
          id?: string;
          is_remote?: boolean;
          latitude?: number | null;
          location?: string | null;
          longitude?: number | null;
          match_score?: number | null;
          posted_at?: string | null;
          salary?: string | null;
          salary_max?: number | null;
          salary_min?: number | null;
          scraped_at?: string;
          source?: Database["public"]["Enums"]["job_source_enum"];
          source_url?: string;
          tech_stack?: string[];
          title?: string;
          url?: string;
          user_id?: string;
          work_type?: Database["public"]["Enums"]["work_type_enum"] | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          country_code: string | null;
          created_at: string;
          email: string;
          first_name: string | null;
          gmail_linked_email: string | null;
          id: string;
          languages: string[];
          last_name: string | null;
          last_scrape_time: string | null;
          latitude: number | null;
          location_radius_km: number;
          longitude: number | null;
          max_daily_applications: number;
          professional_title: string | null;
          profile_complete: boolean;
          role: Database["public"]["Enums"]["user_role"];
          salary_currency: string;
          salary_max: number | null;
          salary_min: number | null;
          seniority_level:
            Database["public"]["Enums"]["seniority_level_enum"] | null;
          target_cities: string[];
          target_countries: string[];
          target_roles: string[];
          updated_at: string;
          work_type_preferences: Database["public"]["Enums"]["work_type_enum"][];
          years_experience: number | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          country_code?: string | null;
          created_at?: string;
          email: string;
          first_name?: string | null;
          gmail_linked_email?: string | null;
          id: string;
          languages?: string[];
          last_name?: string | null;
          last_scrape_time?: string | null;
          latitude?: number | null;
          location_radius_km?: number;
          longitude?: number | null;
          max_daily_applications?: number;
          professional_title?: string | null;
          profile_complete?: boolean;
          role?: Database["public"]["Enums"]["user_role"];
          salary_currency?: string;
          salary_max?: number | null;
          salary_min?: number | null;
          seniority_level?:
            Database["public"]["Enums"]["seniority_level_enum"] | null;
          target_cities?: string[];
          target_countries?: string[];
          target_roles?: string[];
          updated_at?: string;
          work_type_preferences?: Database["public"]["Enums"]["work_type_enum"][];
          years_experience?: number | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          country_code?: string | null;
          created_at?: string;
          email?: string;
          first_name?: string | null;
          gmail_linked_email?: string | null;
          id?: string;
          languages?: string[];
          last_name?: string | null;
          last_scrape_time?: string | null;
          latitude?: number | null;
          location_radius_km?: number;
          longitude?: number | null;
          max_daily_applications?: number;
          professional_title?: string | null;
          profile_complete?: boolean;
          role?: Database["public"]["Enums"]["user_role"];
          salary_currency?: string;
          salary_max?: number | null;
          salary_min?: number | null;
          seniority_level?:
            Database["public"]["Enums"]["seniority_level_enum"] | null;
          target_cities?: string[];
          target_countries?: string[];
          target_roles?: string[];
          updated_at?: string;
          work_type_preferences?: Database["public"]["Enums"]["work_type_enum"][];
          years_experience?: number | null;
        };
        Relationships: [];
      };
      resume_documents: {
        Row: {
          extraction_status: string;
          file_name: string;
          file_size_kb: number | null;
          file_type: string;
          id: string;
          is_primary: boolean;
          label: string | null;
          storage_path: string;
          uploaded_at: string;
          user_id: string;
        };
        Insert: {
          extraction_status?: string;
          file_name: string;
          file_size_kb?: number | null;
          file_type?: string;
          id?: string;
          is_primary?: boolean;
          label?: string | null;
          storage_path: string;
          uploaded_at?: string;
          user_id: string;
        };
        Update: {
          extraction_status?: string;
          file_name?: string;
          file_size_kb?: number | null;
          file_type?: string;
          id?: string;
          is_primary?: boolean;
          label?: string | null;
          storage_path?: string;
          uploaded_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      scrape_rate_limits: {
        Row: {
          last_scrape_at: string | null;
          reset_at: string;
          scrape_count_today: number;
          user_id: string;
        };
        Insert: {
          last_scrape_at?: string | null;
          reset_at?: string;
          scrape_count_today?: number;
          user_id: string;
        };
        Update: {
          last_scrape_at?: string | null;
          reset_at?: string;
          scrape_count_today?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      support_ticket_messages: {
        Row: {
          created_at: string;
          id: string;
          is_staff: boolean;
          message: string;
          sender_id: string;
          ticket_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_staff?: boolean;
          message: string;
          sender_id: string;
          ticket_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_staff?: boolean;
          message?: string;
          sender_id?: string;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "support_tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      support_tickets: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          priority: Database["public"]["Enums"]["support_ticket_priority"];
          status: Database["public"]["Enums"]["support_ticket_status"];
          subject: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          priority?: Database["public"]["Enums"]["support_ticket_priority"];
          status?: Database["public"]["Enums"]["support_ticket_status"];
          subject: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          priority?: Database["public"]["Enums"]["support_ticket_priority"];
          status?: Database["public"]["Enums"]["support_ticket_status"];
          subject?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      system_api_keys: {
        Row: {
          created_at: string;
          created_by: string | null;
          encrypted_key: string;
          id: string;
          is_active: boolean;
          label: string;
          last_used_at: string | null;
          priority_order: number;
          provider: Database["public"]["Enums"]["api_provider_enum"];
          throttled_until: string | null;
          tier: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          encrypted_key: string;
          id?: string;
          is_active?: boolean;
          label: string;
          last_used_at?: string | null;
          priority_order?: number;
          provider: Database["public"]["Enums"]["api_provider_enum"];
          throttled_until?: string | null;
          tier?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          encrypted_key?: string;
          id?: string;
          is_active?: boolean;
          label?: string;
          last_used_at?: string | null;
          priority_order?: number;
          provider?: Database["public"]["Enums"]["api_provider_enum"];
          throttled_until?: string | null;
          tier?: string;
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
        Relationships: [];
      };
      user_api_keys: {
        Row: {
          created_at: string;
          encrypted_key: string;
          id: string;
          is_active: boolean;
          provider: Database["public"]["Enums"]["api_provider_enum"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          encrypted_key: string;
          id?: string;
          is_active?: boolean;
          provider: Database["public"]["Enums"]["api_provider_enum"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          encrypted_key?: string;
          id?: string;
          is_active?: boolean;
          provider?: Database["public"]["Enums"]["api_provider_enum"];
          user_id?: string;
        };
        Relationships: [];
      };
      user_context: {
        Row: {
          career_summary: string | null;
          created_at: string;
          extracted_certifications: Json;
          extracted_education: Json;
          extracted_experience: Json;
          extracted_skills: string[];
          id: string;
          key_achievements: string[];
          last_extracted_at: string | null;
          skill_clusters: Json;
          tone_preference: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          career_summary?: string | null;
          created_at?: string;
          extracted_certifications?: Json;
          extracted_education?: Json;
          extracted_experience?: Json;
          extracted_skills?: string[];
          id?: string;
          key_achievements?: string[];
          last_extracted_at?: string | null;
          skill_clusters?: Json;
          tone_preference?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          career_summary?: string | null;
          created_at?: string;
          extracted_certifications?: Json;
          extracted_education?: Json;
          extracted_experience?: Json;
          extracted_skills?: string[];
          id?: string;
          key_achievements?: string[];
          last_extracted_at?: string | null;
          skill_clusters?: Json;
          tone_preference?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_add_api_key: {
        Args: {
          p_api_key: string;
          p_label?: string;
          p_provider: Database["public"]["Enums"]["api_provider_enum"];
        };
        Returns: string;
      };
      admin_delete_user: { Args: { target_id: string }; Returns: undefined };
      admin_list_api_keys: {
        Args: never;
        Returns: {
          created_at: string;
          id: string;
          is_active: boolean;
          key_preview: string;
          label: string;
          last_used_at: string;
          provider: Database["public"]["Enums"]["api_provider_enum"];
        }[];
      };
      admin_list_users: {
        Args: { p_page?: number; p_page_size?: number };
        Returns: {
          avatar_url: string;
          created_at: string;
          email: string;
          first_name: string;
          id: string;
          last_name: string;
          profile_complete: boolean;
          role: Database["public"]["Enums"]["user_role"];
        }[];
      };
      admin_set_api_key_active: {
        Args: { p_active: boolean; p_key_id: string };
        Returns: undefined;
      };
      check_and_increment_daily_applications: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      clear_my_api_key: {
        Args: { p_provider: Database["public"]["Enums"]["api_provider_enum"] };
        Returns: undefined;
      };
      force_set_role: {
        Args: {
          target_email: string;
          target_role: Database["public"]["Enums"]["user_role"];
        };
        Returns: undefined;
      };
      get_admin_dashboard_stats: { Args: never; Returns: Json };
      get_key_for_provider:
        | {
            Args: { p_provider: string; p_user_id?: string };
            Returns: {
              api_key: string;
              key_id: string;
              source: string;
            }[];
          }
        | {
            Args: {
              p_provider: Database["public"]["Enums"]["api_provider_enum"];
              p_user_id: string;
            };
            Returns: string;
          };
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
      resolve_key_pool:
        | {
            Args: {
              p_provider: Database["public"]["Enums"]["api_provider_enum"];
              p_user_id?: string;
            };
            Returns: {
              api_key: string;
              key_id: string;
              source: string;
            }[];
          }
        | {
            Args: {
              p_provider: Database["public"]["Enums"]["api_provider_enum"];
              p_user_id: string;
            };
            Returns: {
              key: string;
              key_id: string;
              source: Database["public"]["Enums"]["key_source_enum"];
            }[];
          };
      set_my_api_key:
        | {
            Args: {
              p_api_key: string;
              p_label?: string;
              p_provider: Database["public"]["Enums"]["api_provider_enum"];
            };
            Returns: string;
          }
        | {
            Args: {
              p_key: string;
              p_provider: Database["public"]["Enums"]["api_provider_enum"];
            };
            Returns: undefined;
          };
      set_primary_resume: {
        Args: { p_document_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      ai_provider: "gemini" | "rapidapi";
      api_provider_enum:
        | "gemini"
        | "rapidapi"
        | "geodb"
        | "adzuna"
        | "openai"
        | "anthropic"
        | "linkedin";
      application_status_enum:
        | "discovered"
        | "saved"
        | "applied"
        | "interview"
        | "offer"
        | "rejected"
        | "withdrawn";
      cover_letter_strategy_enum:
        "mirror_matching" | "achievement_amplification" | "insider_narrative";
      job_source_enum: "jsearch" | "adzuna" | "linkedin" | "indeed" | "custom";
      job_status: "pending" | "approved" | "rejected" | "applied";
      key_source_enum: "user" | "system";
      seniority_level_enum:
        | "junior"
        | "mid"
        | "senior"
        | "lead"
        | "principal"
        | "director"
        | "vp"
        | "c_level";
      support_ticket_priority: "low" | "medium" | "high" | "urgent";
      support_ticket_status: "open" | "in_progress" | "resolved" | "closed";
      user_role: "member" | "premium" | "admin";
      work_type_enum: "remote" | "hybrid" | "onsite" | "flexible";
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
      api_provider_enum: [
        "gemini",
        "rapidapi",
        "geodb",
        "adzuna",
        "openai",
        "anthropic",
        "linkedin",
      ],
      application_status_enum: [
        "discovered",
        "saved",
        "applied",
        "interview",
        "offer",
        "rejected",
        "withdrawn",
      ],
      cover_letter_strategy_enum: [
        "mirror_matching",
        "achievement_amplification",
        "insider_narrative",
      ],
      job_source_enum: ["jsearch", "adzuna", "linkedin", "indeed", "custom"],
      job_status: ["pending", "approved", "rejected", "applied"],
      key_source_enum: ["user", "system"],
      seniority_level_enum: [
        "junior",
        "mid",
        "senior",
        "lead",
        "principal",
        "director",
        "vp",
        "c_level",
      ],
      support_ticket_priority: ["low", "medium", "high", "urgent"],
      support_ticket_status: ["open", "in_progress", "resolved", "closed"],
      user_role: ["member", "premium", "admin"],
      work_type_enum: ["remote", "hybrid", "onsite", "flexible"],
    },
  },
} as const;
