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
      bookings: {
        Row: {
          created_at: string
          guide_id: string
          id: string
          learner_id: string
          note: string | null
          scheduled_at: string
          session_type_id: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          guide_id: string
          id?: string
          learner_id: string
          note?: string | null
          scheduled_at: string
          session_type_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          guide_id?: string
          id?: string
          learner_id?: string
          note?: string | null
          scheduled_at?: string
          session_type_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_session_type_id_fkey"
            columns: ["session_type_id"]
            isOneToOne: false
            referencedRelation: "guide_session_types"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          image_url: string | null
          media_type: string | null
          tags: string[] | null
          title: string | null
          video_url: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          image_url?: string | null
          media_type?: string | null
          tags?: string[] | null
          title?: string | null
          video_url?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          media_type?: string | null
          tags?: string[] | null
          title?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          guide_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          guide_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          guide_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_session_types: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          guide_id: string
          id: string
          name: string
          price_cents: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes: number
          guide_id: string
          id?: string
          name: string
          price_cents?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          guide_id?: string
          id?: string
          name?: string
          price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "guide_session_types_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guides: {
        Row: {
          accepting_bookings: boolean
          affiliations: string[] | null
          bio: string
          created_at: string
          field: string
          headline: string
          id: string
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          accepting_bookings?: boolean
          affiliations?: string[] | null
          bio: string
          created_at?: string
          field: string
          headline: string
          id?: string
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          accepting_bookings?: boolean
          affiliations?: string[] | null
          bio?: string
          created_at?: string
          field?: string
          headline?: string
          id?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      ingestion_sources: {
        Row: {
          active: boolean
          careers_url: string | null
          created_at: string
          domain: string | null
          hiring_type: string | null
          id: string
          last_run_at: string | null
          name: string
          notes: string | null
          typical_roles: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          active?: boolean
          careers_url?: string | null
          created_at?: string
          domain?: string | null
          hiring_type?: string | null
          id?: string
          last_run_at?: string | null
          name: string
          notes?: string | null
          typical_roles?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          active?: boolean
          careers_url?: string | null
          created_at?: string
          domain?: string | null
          hiring_type?: string | null
          id?: string
          last_run_at?: string | null
          name?: string
          notes?: string | null
          typical_roles?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      interaction_events: {
        Row: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          tags: string[]
          user_id: string
          weight: number
        }
        Insert: {
          action: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          tags?: string[]
          user_id: string
          weight?: number
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          tags?: string[]
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          country: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          domain: string | null
          eligibility: string | null
          featured: boolean
          field: string
          hidden_gem: boolean
          id: string
          kind: string
          location: string | null
          organization: string
          remote: boolean
          skills: string[]
          source_name: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["opportunity_status"]
          stipend: string | null
          submitted_by: string | null
          summary: string
          tags: string[] | null
          title: string
          trending_score: number
          updated_at: string
          url: string | null
          verified_source: boolean
        }
        Insert: {
          country?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          domain?: string | null
          eligibility?: string | null
          featured?: boolean
          field: string
          hidden_gem?: boolean
          id?: string
          kind?: string
          location?: string | null
          organization: string
          remote?: boolean
          skills?: string[]
          source_name?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          stipend?: string | null
          submitted_by?: string | null
          summary: string
          tags?: string[] | null
          title: string
          trending_score?: number
          updated_at?: string
          url?: string | null
          verified_source?: boolean
        }
        Update: {
          country?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          domain?: string | null
          eligibility?: string | null
          featured?: boolean
          field?: string
          hidden_gem?: boolean
          id?: string
          kind?: string
          location?: string | null
          organization?: string
          remote?: boolean
          skills?: string[]
          source_name?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          stipend?: string | null
          submitted_by?: string | null
          summary?: string
          tags?: string[] | null
          title?: string
          trending_score?: number
          updated_at?: string
          url?: string | null
          verified_source?: boolean
        }
        Relationships: []
      }
      opportunity_reposts: {
        Row: {
          comment: string | null
          created_at: string
          opportunity_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          opportunity_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_reposts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_shares: {
        Row: {
          channel: string
          created_at: string
          id: string
          opportunity_id: string
          user_id: string | null
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          opportunity_id: string
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          opportunity_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_shares_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      org_follows: {
        Row: {
          created_at: string
          org_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          org_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          org_name?: string
          user_id?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
          verified: boolean
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          career_goal: string | null
          created_at: string
          display_name: string | null
          education: string | null
          headline: string | null
          id: string
          interests: string[] | null
          location: string | null
          skills: string[]
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          career_goal?: string | null
          created_at?: string
          display_name?: string | null
          education?: string | null
          headline?: string | null
          id: string
          interests?: string[] | null
          location?: string | null
          skills?: string[]
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          career_goal?: string | null
          created_at?: string
          display_name?: string | null
          education?: string | null
          headline?: string | null
          id?: string
          interests?: string[] | null
          location?: string | null
          skills?: string[]
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_opportunities: {
        Row: {
          created_at: string
          opportunity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          opportunity_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_opportunities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          category: string
          created_at: string
          id: string
          label: string
          slug: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          label: string
          slug: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          label?: string
          slug?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      co_saved_opportunities: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          opportunity_id: string
          score: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "guide" | "user"
      booking_status: "pending" | "confirmed" | "cancelled" | "completed"
      opportunity_kind:
        | "fellowship"
        | "competition"
        | "research"
        | "internship"
        | "scholarship"
        | "grant"
        | "residency"
        | "bootcamp"
        | "other"
      opportunity_status: "pending" | "published" | "rejected"
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
      app_role: ["admin", "guide", "user"],
      booking_status: ["pending", "confirmed", "cancelled", "completed"],
      opportunity_kind: [
        "fellowship",
        "competition",
        "research",
        "internship",
        "scholarship",
        "grant",
        "residency",
        "bootcamp",
        "other",
      ],
      opportunity_status: ["pending", "published", "rejected"],
    },
  },
} as const
