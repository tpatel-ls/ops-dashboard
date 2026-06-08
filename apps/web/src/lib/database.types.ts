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
      books: {
        Row: {
          author: string | null
          cover_url: string | null
          created_at: string
          deleted_at: string | null
          device_id: string
          finished_at: string | null
          format: string | null
          id: string
          isbn: string | null
          rating: number | null
          started_at: string | null
          status: string
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          device_id: string
          finished_at?: string | null
          format?: string | null
          id: string
          isbn?: string | null
          rating?: number | null
          started_at?: string | null
          status?: string
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          device_id?: string
          finished_at?: string | null
          format?: string | null
          id?: string
          isbn?: string | null
          rating?: number | null
          started_at?: string | null
          status?: string
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      captures: {
        Row: {
          ai_kind: string | null
          ai_summary: string | null
          created_at: string
          deleted_at: string | null
          device_id: string
          id: string
          raw: string
          routed_to: Json | null
          source: string
          status: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          ai_kind?: string | null
          ai_summary?: string | null
          created_at?: string
          deleted_at?: string | null
          device_id: string
          id: string
          raw: string
          routed_to?: Json | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          ai_kind?: string | null
          ai_summary?: string | null
          created_at?: string
          deleted_at?: string | null
          device_id?: string
          id?: string
          raw?: string
          routed_to?: Json | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      checklist_templates: {
        Row: {
          created_at: string
          deleted_at: string | null
          device_id: string
          id: string
          items: string[]
          kind: string | null
          name: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          device_id: string
          id: string
          items?: string[]
          kind?: string | null
          name: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          device_id?: string
          id?: string
          items?: string[]
          kind?: string | null
          name?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      content: {
        Row: {
          channel: string | null
          checklist: Json
          created_at: string
          deleted_at: string | null
          device_id: string
          domain_id: string | null
          id: string
          order: number
          outline: string | null
          publish_date: string | null
          status: string
          title: string
          type: string
          updated_at: string
          url: string | null
          user_id: string
          version: number
        }
        Insert: {
          channel?: string | null
          checklist?: Json
          created_at?: string
          deleted_at?: string | null
          device_id: string
          domain_id?: string | null
          id: string
          order?: number
          outline?: string | null
          publish_date?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
          url?: string | null
          user_id?: string
          version?: number
        }
        Update: {
          channel?: string | null
          checklist?: Json
          created_at?: string
          deleted_at?: string | null
          device_id?: string
          domain_id?: string | null
          id?: string
          order?: number
          outline?: string | null
          publish_date?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          url?: string | null
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      domains: {
        Row: {
          archived_at: string | null
          color: string
          created_at: string
          deleted_at: string | null
          description: string | null
          device_id: string
          icon: string | null
          id: string
          name: string
          order: number
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          color: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          device_id: string
          icon?: string | null
          id: string
          name: string
          order?: number
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          color?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          device_id?: string
          icon?: string | null
          id?: string
          name?: string
          order?: number
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          body: string
          created_at: string
          date: string
          deleted_at: string | null
          device_id: string
          flagged_for_review: boolean | null
          id: string
          media_urls: string[]
          mood: string | null
          source: string | null
          tags: string[]
          title: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          body: string
          created_at?: string
          date: string
          deleted_at?: string | null
          device_id: string
          flagged_for_review?: boolean | null
          id: string
          media_urls?: string[]
          mood?: string | null
          source?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          body?: string
          created_at?: string
          date?: string
          deleted_at?: string | null
          device_id?: string
          flagged_for_review?: boolean | null
          id?: string
          media_urls?: string[]
          mood?: string | null
          source?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      notes: {
        Row: {
          body: string
          book_id: string | null
          created_at: string
          deleted_at: string | null
          device_id: string
          flagged_for_review: boolean | null
          id: string
          image_url: string | null
          source: string | null
          tags: string[]
          title: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          body: string
          book_id?: string | null
          created_at?: string
          deleted_at?: string | null
          device_id: string
          flagged_for_review?: boolean | null
          id: string
          image_url?: string | null
          source?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          body?: string
          book_id?: string | null
          created_at?: string
          deleted_at?: string | null
          device_id?: string
          flagged_for_review?: boolean | null
          id?: string
          image_url?: string | null
          source?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          deleted_at: string | null
          device_id: string
          id: string
          kind: string
          read_at: string | null
          ref_id: string | null
          ref_type: string | null
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          device_id: string
          id: string
          kind?: string
          read_at?: string | null
          ref_id?: string | null
          ref_type?: string | null
          title: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          device_id?: string
          id?: string
          kind?: string
          read_at?: string | null
          ref_id?: string | null
          ref_type?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      people: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          device_id: string
          domain_id: string | null
          facts: Json
          id: string
          interactions: Json
          name: string
          relationship: string | null
          tags: string[]
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          device_id: string
          domain_id?: string | null
          facts?: Json
          id: string
          interactions?: Json
          name: string
          relationship?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          device_id?: string
          domain_id?: string | null
          facts?: Json
          id?: string
          interactions?: Json
          name?: string
          relationship?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      projects: {
        Row: {
          archived_at: string | null
          checklists: Json
          color: string
          created_at: string
          deleted_at: string | null
          description: string | null
          device_id: string
          domain_id: string | null
          due_date: string | null
          icon: string | null
          id: string
          kind: string
          last_worked_at: string | null
          milestones: Json
          name: string
          retainer_reset_day: number | null
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          checklists?: Json
          color: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          device_id: string
          domain_id?: string | null
          due_date?: string | null
          icon?: string | null
          id: string
          kind?: string
          last_worked_at?: string | null
          milestones?: Json
          name: string
          retainer_reset_day?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          checklists?: Json
          color?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          device_id?: string
          domain_id?: string | null
          due_date?: string | null
          icon?: string | null
          id?: string
          kind?: string
          last_worked_at?: string | null
          milestones?: Json
          name?: string
          retainer_reset_day?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      quotes: {
        Row: {
          author: string | null
          book_id: string | null
          created_at: string
          deleted_at: string | null
          device_id: string
          favorite: boolean | null
          id: string
          source: string | null
          source_type: string | null
          tags: string[]
          text: string
          thoughts: Json
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          author?: string | null
          book_id?: string | null
          created_at?: string
          deleted_at?: string | null
          device_id: string
          favorite?: boolean | null
          id: string
          source?: string | null
          source_type?: string | null
          tags?: string[]
          text: string
          thoughts?: Json
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          author?: string | null
          book_id?: string | null
          created_at?: string
          deleted_at?: string | null
          device_id?: string
          favorite?: boolean | null
          id?: string
          source?: string | null
          source_type?: string | null
          tags?: string[]
          text?: string
          thoughts?: Json
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      routine_checks: {
        Row: {
          completed_at: string | null
          created_at: string
          date: string
          deleted_at: string | null
          device_id: string
          done: boolean
          id: string
          routine_id: string
          source: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          date: string
          deleted_at?: string | null
          device_id: string
          done?: boolean
          id: string
          routine_id: string
          source?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          date?: string
          deleted_at?: string | null
          device_id?: string
          done?: boolean
          id?: string
          routine_id?: string
          source?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      routines: {
        Row: {
          archived_at: string | null
          color: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          device_id: string
          domain_id: string | null
          duration_days: number | null
          end_date: string | null
          id: string
          kind: string
          name: string
          notify: boolean
          order: number
          specific_time: string | null
          start_date: string
          time_of_day: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          device_id: string
          domain_id?: string | null
          duration_days?: number | null
          end_date?: string | null
          id: string
          kind?: string
          name: string
          notify?: boolean
          order?: number
          specific_time?: string | null
          start_date: string
          time_of_day?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          device_id?: string
          domain_id?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string
          kind?: string
          name?: string
          notify?: boolean
          order?: number
          specific_time?: string | null
          start_date?: string
          time_of_day?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      tasks: {
        Row: {
          actual_minutes: number | null
          checklist: Json
          completed_at: string | null
          content_id: string | null
          created_at: string
          deleted_at: string | null
          device_id: string
          domain_id: string | null
          due_at: string | null
          end_at: string | null
          estimate_minutes: number | null
          id: string
          notes: string | null
          order: number
          parent_id: string | null
          priority: number
          project_id: string | null
          recurrence: Json | null
          reminders: Json
          scheduled_for: string | null
          starred: boolean
          start_at: string | null
          status: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          actual_minutes?: number | null
          checklist?: Json
          completed_at?: string | null
          content_id?: string | null
          created_at?: string
          deleted_at?: string | null
          device_id: string
          domain_id?: string | null
          due_at?: string | null
          end_at?: string | null
          estimate_minutes?: number | null
          id: string
          notes?: string | null
          order?: number
          parent_id?: string | null
          priority?: number
          project_id?: string | null
          recurrence?: Json | null
          reminders?: Json
          scheduled_for?: string | null
          starred?: boolean
          start_at?: string | null
          status: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          actual_minutes?: number | null
          checklist?: Json
          completed_at?: string | null
          content_id?: string | null
          created_at?: string
          deleted_at?: string | null
          device_id?: string
          domain_id?: string | null
          due_at?: string | null
          end_at?: string | null
          estimate_minutes?: number | null
          id?: string
          notes?: string | null
          order?: number
          parent_id?: string | null
          priority?: number
          project_id?: string | null
          recurrence?: Json | null
          reminders?: Json
          scheduled_for?: string | null
          starred?: boolean
          start_at?: string | null
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      whiteboards: {
        Row: {
          created_at: string
          deleted_at: string | null
          device_id: string
          document: Json
          id: string
          linked_task_ids: string[]
          name: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          device_id: string
          document: Json
          id: string
          linked_task_ids?: string[]
          name: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          device_id?: string
          document?: Json
          id?: string
          linked_task_ids?: string[]
          name?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      work_logs: {
        Row: {
          at: string
          created_at: string
          deleted_at: string | null
          device_id: string
          id: string
          minutes: number
          note: string | null
          project_id: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          at: string
          created_at?: string
          deleted_at?: string | null
          device_id: string
          id: string
          minutes: number
          note?: string | null
          project_id: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          at?: string
          created_at?: string
          deleted_at?: string | null
          device_id?: string
          id?: string
          minutes?: number
          note?: string | null
          project_id?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
