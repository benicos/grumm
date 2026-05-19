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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          accent_color?: string;
          tone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          accent_color?: string;
          tone?: string;
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
          hook: string;
          content: string;
          source: string;
          source_url: string | null;
          author_id: string | null;
          status: "draft" | "pending_review" | "published" | "rejected" | "archived";
          published_at: string | null;
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
          hook: string;
          content: string;
          source: string;
          source_url?: string | null;
          author_id?: string | null;
          status?: "draft" | "pending_review" | "published" | "rejected" | "archived";
          published_at?: string | null;
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
          hook?: string;
          content?: string;
          source?: string;
          source_url?: string | null;
          author_id?: string | null;
          status?: "draft" | "pending_review" | "published" | "rejected" | "archived";
          published_at?: string | null;
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
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          daily_goal: number;
          role: "membre" | "redacteur" | "administrateur";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          daily_goal?: number;
          role?: "membre" | "redacteur" | "administrateur";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          daily_goal?: number;
          role?: "membre" | "redacteur" | "administrateur";
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
        };
        Returns: {
          id: string;
          slug: string;
          title: string;
          hook: string;
          content: string;
          source: string;
          source_url: string | null;
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
      get_admin_fact_authors: {
        Args: {
          p_fact_ids?: string[];
        };
        Returns: {
          fact_id: string;
          author_id: string | null;
          username: string | null;
          role: "membre" | "redacteur" | "administrateur" | null;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
