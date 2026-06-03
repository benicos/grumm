export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          accent_color: string;
          tone: string;
          description_courte: string | null;
          description_longue: string | null;
          seo_title: string | null;
          seo_description: string | null;
          keywords: string[] | null;
          visual_motif: string | null;
          gradient_start: string | null;
          gradient_middle: string | null;
          gradient_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          accent_color?: string;
          tone?: string;
          description_courte?: string | null;
          description_longue?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          keywords?: string[] | null;
          visual_motif?: string | null;
          gradient_start?: string | null;
          gradient_middle?: string | null;
          gradient_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          accent_color?: string;
          tone?: string;
          description_courte?: string | null;
          description_longue?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          keywords?: string[] | null;
          visual_motif?: string | null;
          gradient_start?: string | null;
          gradient_middle?: string | null;
          gradient_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      facts: {
        Row: {
          id: string;
          category_id: string;
          slug: string;
          title: string;
          hook: string | null;
          content: string;
          difficulty_level: "basic" | "intermediate" | "advanced";
          long_content: string | null;
          source: string | null;
          source_url: string | null;
          seo_title: string | null;
          seo_description: string | null;
          author_id: string | null;
          status: "draft" | "pending_review" | "published" | "rejected" | "archived";
          published_at: string | null;
          event_day: number | null;
          event_month: number | null;
          event_year: number | null;
          display_order: number;
          tone: string | null;
          accent_color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          slug?: string;
          title: string;
          hook?: string | null;
          content: string;
          difficulty_level?: "basic" | "intermediate" | "advanced";
          long_content?: string | null;
          source?: string | null;
          source_url?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          author_id?: string | null;
          status?: "draft" | "pending_review" | "published" | "rejected" | "archived";
          published_at?: string | null;
          event_day?: number | null;
          event_month?: number | null;
          event_year?: number | null;
          display_order?: number;
          tone?: string | null;
          accent_color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          slug?: string;
          title?: string;
          hook?: string | null;
          content?: string;
          difficulty_level?: "basic" | "intermediate" | "advanced";
          long_content?: string | null;
          source?: string | null;
          source_url?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          author_id?: string | null;
          status?: "draft" | "pending_review" | "published" | "rejected" | "archived";
          published_at?: string | null;
          event_day?: number | null;
          event_month?: number | null;
          event_year?: number | null;
          display_order?: number;
          tone?: string | null;
          accent_color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facts_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      fact_relations: {
        Row: {
          id: string;
          source_fact_id: string;
          related_fact_id: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_fact_id: string;
          related_fact_id: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          source_fact_id?: string;
          related_fact_id?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fact_relations_source_fact_id_fkey";
            columns: ["source_fact_id"];
            isOneToOne: false;
            referencedRelation: "facts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fact_relations_related_fact_id_fkey";
            columns: ["related_fact_id"];
            isOneToOne: false;
            referencedRelation: "facts";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          daily_goal: number;
          learning_goal: "basics" | "strengthen" | "advanced";
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          daily_goal?: number;
          learning_goal?: "basics" | "strengthen" | "advanced";
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          daily_goal?: number;
          learning_goal?: "basics" | "strengthen" | "advanced";
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          fact_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          fact_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          fact_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "likes_fact_id_fkey";
            columns: ["fact_id"];
            isOneToOne: false;
            referencedRelation: "facts";
            referencedColumns: ["id"];
          },
        ];
      };
      saves: {
        Row: {
          id: string;
          user_id: string;
          fact_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          fact_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          fact_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saves_fact_id_fkey";
            columns: ["fact_id"];
            isOneToOne: false;
            referencedRelation: "facts";
            referencedColumns: ["id"];
          },
        ];
      };
      views: {
        Row: {
          id: string;
          user_id: string;
          fact_id: string;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          fact_id: string;
          viewed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          fact_id?: string;
          viewed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "views_fact_id_fkey";
            columns: ["fact_id"];
            isOneToOne: false;
            referencedRelation: "facts";
            referencedColumns: ["id"];
          },
        ];
      };
      user_fact_views: {
        Row: {
          id: string;
          user_id: string;
          fact_id: string;
          first_viewed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          fact_id: string;
          first_viewed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          fact_id?: string;
          first_viewed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_fact_views_fact_id_fkey";
            columns: ["fact_id"];
            isOneToOne: false;
            referencedRelation: "facts";
            referencedColumns: ["id"];
          },
        ];
      };
      user_daily_progress: {
        Row: {
          id: string;
          user_id: string;
          progress_date: string;
          viewed_fact_ids: string[];
          facts_read_count: number;
          daily_goal: number;
          goal_completed: boolean;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          progress_date?: string;
          viewed_fact_ids?: string[];
          facts_read_count?: number;
          daily_goal?: number;
          goal_completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          progress_date?: string;
          viewed_fact_ids?: string[];
          facts_read_count?: number;
          daily_goal?: number;
          goal_completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      analytics_sessions: {
        Row: {
          id: string;
          user_id: string | null;
          anonymous_id: string | null;
          platform: "web" | "ios";
          started_at: string;
          ended_at: string | null;
          duration_seconds: number | null;
          pages_viewed: number;
          facts_viewed: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          anonymous_id?: string | null;
          platform: "web" | "ios";
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          pages_viewed?: number;
          facts_viewed?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          anonymous_id?: string | null;
          platform?: "web" | "ios";
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          pages_viewed?: number;
          facts_viewed?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      analytics_events: {
        Row: {
          id: string;
          session_id: string | null;
          user_id: string | null;
          anonymous_id: string | null;
          event_name: string;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Json;
          platform: "web" | "ios";
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          anonymous_id?: string | null;
          event_name: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          platform: "web" | "ios";
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          anonymous_id?: string | null;
          event_name?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          platform?: "web" | "ios";
          created_at?: string;
        };
        Relationships: [];
      };
      fact_read_events: {
        Row: {
          id: string;
          session_id: string | null;
          user_id: string | null;
          anonymous_id: string | null;
          fact_id: string;
          platform: "web" | "ios";
          started_at: string;
          ended_at: string | null;
          duration_seconds: number | null;
          completed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          anonymous_id?: string | null;
          fact_id: string;
          platform: "web" | "ios";
          started_at: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          completed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          anonymous_id?: string | null;
          fact_id?: string;
          platform?: "web" | "ios";
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          completed?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      quiz_sessions: {
        Row: {
          id: string;
          user_id: string;
          started_at: string;
          completed_at: string | null;
          score: number;
          total_questions: number;
          quiz_type: "memory_challenge" | "general_quizz";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          started_at?: string;
          completed_at?: string | null;
          score?: number;
          total_questions?: number;
          quiz_type?: "memory_challenge" | "general_quizz";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          started_at?: string;
          completed_at?: string | null;
          score?: number;
          total_questions?: number;
          quiz_type?: "memory_challenge" | "general_quizz";
          created_at?: string;
        };
        Relationships: [];
      };
      quiz_answers: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          fact_id: string;
          selected_answer: string;
          correct_answer: string;
          is_correct: boolean;
          answered_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          fact_id: string;
          selected_answer: string;
          correct_answer: string;
          is_correct?: boolean;
          answered_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          fact_id?: string;
          selected_answer?: string;
          correct_answer?: string;
          is_correct?: boolean;
          answered_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_answers_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "quiz_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_answers_fact_id_fkey";
            columns: ["fact_id"];
            isOneToOne: false;
            referencedRelation: "facts";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_questions: {
        Row: {
          id: string;
          fact_id: string | null;
          question: string;
          correct_answer: string;
          wrong_answer_1: string;
          wrong_answer_2: string;
          wrong_answer_3: string;
          difficulty: "easy" | "standard" | "hard";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          fact_id?: string | null;
          question: string;
          correct_answer: string;
          wrong_answer_1: string;
          wrong_answer_2: string;
          wrong_answer_3: string;
          difficulty?: "easy" | "standard" | "hard";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          fact_id?: string | null;
          question?: string;
          correct_answer?: string;
          wrong_answer_1?: string;
          wrong_answer_2?: string;
          wrong_answer_3?: string;
          difficulty?: "easy" | "standard" | "hard";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_questions_fact_id_fkey";
            columns: ["fact_id"];
            isOneToOne: false;
            referencedRelation: "facts";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          slug: string;
          name: string;
          description: string | null;
          permissions: Json;
          is_system: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          slug: string;
          name: string;
          description?: string | null;
          permissions?: Json;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          slug?: string;
          name?: string;
          description?: string | null;
          permissions?: Json;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      grades: {
        Row: {
          id: string;
          slug: string;
          name: string;
          required_goals: number;
          description: string | null;
          badge: string | null;
          display_order: number;
          is_system: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          required_goals: number;
          description?: string | null;
          badge?: string | null;
          display_order?: number;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          required_goals?: number;
          description?: string | null;
          badge?: string | null;
          display_order?: number;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_username_available: {
        Args: {
          p_username: string;
        };
        Returns: boolean;
      };
      record_fact_read: {
        Args: {
          p_fact_id: string;
          p_progress_date: string;
          p_daily_goal: number;
        };
        Returns: {
          facts_read_count: number;
          daily_goal: number;
          goal_completed: boolean;
          completed_today: boolean;
          unique_view_created: boolean;
          completed_goals_count: number;
        }[];
      };
      get_discover_feed: {
        Args: {
          p_limit?: number;
          p_theme_slug?: string | null;
          p_exclude_ids?: string[];
          p_learning_goal?: "basics" | "strengthen" | "advanced" | null;
        };
        Returns: {
          id: string;
          slug: string;
          title: string;
          hook: string | null;
          content: string;
          source: string | null;
          source_url: string | null;
          difficulty_level: "basic" | "intermediate" | "advanced";
          tone: string | null;
          accent_color: string | null;
          category_id: string;
          category_name: string;
          category_slug: string;
          category_tone: string;
          category_accent_color: string;
          seen_by_user: boolean;
        }[];
      };
      get_personalized_feed: {
        Args: {
          p_user_id?: string | null;
          p_limit?: number;
          p_session_id?: string | null;
          p_debug?: boolean;
          p_theme_slug?: string | null;
        };
        Returns: {
          id: string;
          slug: string;
          title: string;
          hook: string | null;
          content: string;
          source: string | null;
          source_url: string | null;
          difficulty_level: "basic" | "intermediate" | "advanced";
          long_content: string | null;
          seo_title: string | null;
          seo_description: string | null;
          event_day: number | null;
          event_month: number | null;
          event_year: number | null;
          published_at: string | null;
          updated_at: string | null;
          tone: string | null;
          accent_color: string | null;
          category_id: string;
          category_name: string;
          category_slug: string;
          category_tone: string;
          category_accent_color: string;
          seen_by_user: boolean;
          recommendation_score: number;
          score_debug: Json | null;
        }[];
      };
      get_admin_fact_authors: {
        Args: {
          p_fact_ids?: string[];
        };
        Returns: {
          fact_id: string;
          author_id: string | null;
          username: string | null;
          role: string | null;
        }[];
      };
      get_explorer_themes: {
        Args: {
          p_limit?: number;
          p_query?: string | null;
        };
        Returns: {
          id: string;
          name: string;
          slug: string;
          tone: string;
          accent_color: string;
          published_facts_count: number;
        }[];
      };
      search_published_facts: {
        Args: {
          p_query: string;
          p_limit?: number;
        };
        Returns: {
          id: string;
          slug: string;
          title: string;
          hook: string | null;
          content: string;
          source: string | null;
          source_url: string | null;
          tone: string | null;
          accent_color: string | null;
          category_id: string;
          category_name: string;
          category_slug: string;
          category_tone: string;
          category_accent_color: string;
          rank: number;
        }[];
      };
      get_fact_of_the_day: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          slug: string;
          title: string;
          hook: string | null;
          content: string;
          source: string | null;
          source_url: string | null;
          tone: string | null;
          accent_color: string | null;
          category_id: string;
          category_name: string;
          category_slug: string;
          category_tone: string;
          category_accent_color: string;
          interaction_count: number;
        }[];
      };
      get_admin_profiles: {
        Args: {
          p_query?: string | null;
          p_role?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          id: string;
          email: string | null;
          username: string;
          avatar_url: string | null;
          daily_goal: number;
          learning_goal: "basics" | "strengthen" | "advanced";
          role: string;
          created_at: string;
          updated_at: string;
          total_count: number;
        }[];
      };
      delete_admin_user: {
        Args: {
          p_user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
