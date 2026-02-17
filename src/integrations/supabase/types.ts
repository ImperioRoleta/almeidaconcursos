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
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          key: string
          name: string
          threshold: number
          xp_reward: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          key: string
          name: string
          threshold?: number
          xp_reward?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          key?: string
          name?: string
          threshold?: number
          xp_reward?: number
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          applicable_plans: string[] | null
          code: string
          created_at: string
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          min_amount: number | null
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_plans?: string[] | null
          code: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_amount?: number | null
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applicable_plans?: string[] | null
          code?: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_amount?: number | null
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      diagnostic_results: {
        Row: {
          completed_at: string
          id: string
          recommendations: Json | null
          score: number | null
          strong_subjects: string[] | null
          subject_scores: Json
          total_correct: number
          total_questions: number
          user_id: string
          weak_subjects: string[] | null
        }
        Insert: {
          completed_at?: string
          id?: string
          recommendations?: Json | null
          score?: number | null
          strong_subjects?: string[] | null
          subject_scores?: Json
          total_correct?: number
          total_questions?: number
          user_id: string
          weak_subjects?: string[] | null
        }
        Update: {
          completed_at?: string
          id?: string
          recommendations?: Json | null
          score?: number | null
          strong_subjects?: string[] | null
          subject_scores?: Json
          total_correct?: number
          total_questions?: number
          user_id?: string
          weak_subjects?: string[] | null
        }
        Relationships: []
      }
      essay_themes: {
        Row: {
          active_date: string
          created_at: string
          created_by: string
          description: string
          genre: string
          id: string
          motivating_texts: Json | null
          title: string
        }
        Insert: {
          active_date?: string
          created_at?: string
          created_by?: string
          description: string
          genre?: string
          id?: string
          motivating_texts?: Json | null
          title: string
        }
        Update: {
          active_date?: string
          created_at?: string
          created_by?: string
          description?: string
          genre?: string
          id?: string
          motivating_texts?: Json | null
          title?: string
        }
        Relationships: []
      }
      essays: {
        Row: {
          content: string
          corrected_at: string | null
          correction: Json | null
          created_at: string
          id: string
          score: number | null
          status: string
          theme_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          corrected_at?: string | null
          correction?: Json | null
          created_at?: string
          id?: string
          score?: number | null
          status?: string
          theme_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          corrected_at?: string | null
          correction?: Json | null
          created_at?: string
          id?: string
          score?: number | null
          status?: string
          theme_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "essays_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "essay_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          is_premium: boolean | null
          order_index: number | null
          title: string
          topic_id: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_premium?: boolean | null
          order_index?: number | null
          title: string
          topic_id: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_premium?: boolean | null
          order_index?: number | null
          title?: string
          topic_id?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          id: number
          min_accuracy: number | null
          min_hours: number | null
          name: string
          rank_order: number
        }
        Insert: {
          id?: number
          min_accuracy?: number | null
          min_hours?: number | null
          name: string
          rank_order?: number
        }
        Update: {
          id?: number
          min_accuracy?: number | null
          min_hours?: number | null
          name?: string
          rank_order?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          admin_notes: string | null
          amount: number | null
          created_at: string
          id: string
          mp_payment_id: string | null
          mp_status: string | null
          plan: string
          proof_info: string | null
          reviewed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount?: number | null
          created_at?: string
          id?: string
          mp_payment_id?: string | null
          mp_status?: string | null
          plan?: string
          proof_info?: string | null
          reviewed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number | null
          created_at?: string
          id?: string
          mp_payment_id?: string | null
          mp_status?: string | null
          plan?: string
          proof_info?: string | null
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          badge_text: string | null
          billing_period: string
          color: string | null
          created_at: string
          description: string | null
          features: Json
          id: string
          image_url: string | null
          is_active: boolean
          is_blocked: boolean
          is_featured: boolean
          name: string
          order_index: number
          original_price: number | null
          price: number
          slug: string
          updated_at: string
        }
        Insert: {
          badge_text?: string | null
          billing_period?: string
          color?: string | null
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_blocked?: boolean
          is_featured?: boolean
          name: string
          order_index?: number
          original_price?: number | null
          price?: number
          slug: string
          updated_at?: string
        }
        Update: {
          badge_text?: string | null
          billing_period?: string
          color?: string | null
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_blocked?: boolean
          is_featured?: boolean
          name?: string
          order_index?: number
          original_price?: number | null
          price?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          category: string
          id: string
          key: string
          label: string
          updated_at: string
          value: string
        }
        Insert: {
          category?: string
          id?: string
          key: string
          label?: string
          updated_at?: string
          value?: string
        }
        Update: {
          category?: string
          id?: string
          key?: string
          label?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          diagnostic_completed: boolean | null
          id: string
          last_reset_at: string | null
          level_id: number | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          diagnostic_completed?: boolean | null
          id?: string
          last_reset_at?: string | null
          level_id?: number | null
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          diagnostic_completed?: boolean | null
          id?: string
          last_reset_at?: string | null
          level_id?: number | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      question_options: {
        Row: {
          id: string
          is_correct: boolean
          label: string
          question_id: string
          text: string
        }
        Insert: {
          id?: string
          is_correct?: boolean
          label: string
          question_id: string
          text: string
        }
        Update: {
          id?: string
          is_correct?: boolean
          label?: string
          question_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string
          difficulty: string | null
          explanation: string | null
          id: string
          is_premium: boolean | null
          statement: string
          subject_id: string
          topic_id: string | null
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          is_premium?: boolean | null
          statement: string
          subject_id: string
          topic_id?: string | null
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          is_premium?: boolean | null
          statement?: string
          subject_id?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      review_queue: {
        Row: {
          created_at: string
          ease_factor: number
          id: string
          interval_days: number
          last_reviewed_at: string | null
          next_review_at: string
          question_id: string
          repetitions: number
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ease_factor?: number
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          next_review_at?: string
          question_id: string
          repetitions?: number
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ease_factor?: number
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          next_review_at?: string
          question_id?: string
          repetitions?: number
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_queue_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_results: {
        Row: {
          completed_at: string
          duration_seconds: number | null
          id: string
          score: number | null
          simulation_id: string
          total_correct: number | null
          total_wrong: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          duration_seconds?: number | null
          id?: string
          score?: number | null
          simulation_id: string
          total_correct?: number | null
          total_wrong?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string
          duration_seconds?: number | null
          id?: string
          score?: number | null
          simulation_id?: string
          total_correct?: number | null
          total_wrong?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_results_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      simulations: {
        Row: {
          created_at: string
          id: string
          status: string | null
          time_limit_minutes: number | null
          title: string
          total_questions: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string | null
          time_limit_minutes?: number | null
          title?: string
          total_questions?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string | null
          time_limit_minutes?: number | null
          title?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      study_plans: {
        Row: {
          created_at: string
          current_day: number
          description: string | null
          id: string
          plan_data: Json
          status: string
          title: string
          total_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_day?: number
          description?: string | null
          id?: string
          plan_data?: Json
          status?: string
          title?: string
          total_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_day?: number
          description?: string | null
          id?: string
          plan_data?: Json
          status?: string
          title?: string
          total_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          duration_seconds: number | null
          ended_at: string | null
          id: string
          started_at: string
          subject_id: string | null
          user_id: string
        }
        Insert: {
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          subject_id?: string | null
          user_id: string
        }
        Update: {
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_trail: {
        Row: {
          completed_at: string | null
          current_step: string
          id: string
          lessons_done: number
          questions_done: number
          review_done: boolean
          simulation_done: boolean
          started_at: string
          subject_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          current_step?: string
          id?: string
          lessons_done?: number
          questions_done?: number
          review_done?: boolean
          simulation_done?: boolean
          started_at?: string
          subject_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          current_step?: string
          id?: string
          lessons_done?: number
          questions_done?: number
          review_done?: boolean
          simulation_done?: boolean
          started_at?: string
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_trail_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          name: string
          order_index: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          order_index?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          order_index?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expire_date: string | null
          id: string
          mp_payment_id: string | null
          plan: string
          start_date: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expire_date?: string | null
          id?: string
          mp_payment_id?: string | null
          plan?: string
          start_date?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expire_date?: string | null
          id?: string
          mp_payment_id?: string | null
          plan?: string
          start_date?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          order_index: number | null
          subject_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          order_index?: number | null
          subject_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          order_index?: number | null
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_answers: {
        Row: {
          answered_at: string
          id: string
          is_correct: boolean
          question_id: string
          selected_option_id: string | null
          user_id: string
        }
        Insert: {
          answered_at?: string
          id?: string
          is_correct: boolean
          question_id: string
          selected_option_id?: string | null
          user_id: string
        }
        Update: {
          answered_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_option_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "question_options"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          id: string
          lesson_id: string | null
          subject_id: string | null
          topic_id: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          lesson_id?: string | null
          subject_id?: string | null
          topic_id?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          lesson_id?: string | null
          subject_id?: string | null
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      admin_block_user: {
        Args: {
          _admin_user_id: string
          _block: boolean
          _target_user_id: string
        }
        Returns: Json
      }
      admin_grant_subscription: {
        Args: {
          _admin_user_id: string
          _duration_days: number
          _plan: string
          _target_user_ids: string[]
        }
        Returns: Json
      }
      admin_grant_trial: {
        Args: {
          _admin_user_id: string
          _duration_days: number
          _target_user_ids: string[]
        }
        Returns: Json
      }
      admin_reset_user_data: {
        Args: { _admin_user_id: string; _target_user_id: string }
        Returns: Json
      }
      admin_toggle_role: {
        Args: {
          _admin_user_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: Json
      }
      get_leaderboard: {
        Args: never
        Returns: {
          accuracy: number
          avatar_url: string
          level_name: string
          name: string
          streak: number
          total_hours: number
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_self_reset: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
