// Generated from the Supabase schema (do not edit by hand). Regenerate after every migration.
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_reviews: {
        Row: {
          agrees: boolean
          attempt_id: string
          attempt_type: string
          created_at: string
          id: string
          note: string | null
          reviewer_id: string | null
          updated_at: string
        }
        Insert: {
          agrees: boolean
          attempt_id: string
          attempt_type: string
          created_at?: string
          id?: string
          note?: string | null
          reviewer_id?: string | null
          updated_at?: string
        }
        Update: {
          agrees?: boolean
          attempt_id?: string
          attempt_type?: string
          created_at?: string
          id?: string
          note?: string | null
          reviewer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          created_at: string
          day: string
          error: string | null
          feature: string
          id: number
          input_tokens: number | null
          model: string
          ok: boolean
          output_tokens: number | null
          provider: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day?: string
          error?: string | null
          feature: string
          id?: never
          input_tokens?: number | null
          model: string
          ok: boolean
          output_tokens?: number | null
          provider: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day?: string
          error?: string | null
          feature?: string
          id?: never
          input_tokens?: number | null
          model?: string
          ok?: boolean
          output_tokens?: number | null
          provider?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          created_at: string
          daily_minutes: number | null
          guardian_consent_at: string | null
          id: string
          motivation: string | null
          path_id: string | null
          privacy_consent_at: string | null
          recommendation_deleted_at: string | null
          recommendation_name: string | null
          recommendation_path: string | null
          recommendation_size: number | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_id: string
          submitted_at: string | null
          target_date: string | null
          target_exam: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_minutes?: number | null
          guardian_consent_at?: string | null
          id?: string
          motivation?: string | null
          path_id?: string | null
          privacy_consent_at?: string | null
          recommendation_deleted_at?: string | null
          recommendation_name?: string | null
          recommendation_path?: string | null
          recommendation_size?: number | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id: string
          submitted_at?: string | null
          target_date?: string | null
          target_exam?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_minutes?: number | null
          guardian_consent_at?: string | null
          id?: string
          motivation?: string | null
          path_id?: string | null
          privacy_consent_at?: string | null
          recommendation_deleted_at?: string | null
          recommendation_name?: string | null
          recommendation_path?: string | null
          recommendation_size?: number | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id?: string
          submitted_at?: string | null
          target_date?: string | null
          target_exam?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          data: Json
          id: number
          target: string | null
          updated_at: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          data?: Json
          id?: never
          target?: string | null
          updated_at?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          data?: Json
          id?: never
          target?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          created_at: string
          current_level_id: string | null
          id: string
          is_primary: boolean
          path_id: string
          start_unit_id: string | null
          started_at: string
          student_id: string
          target: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_level_id?: string | null
          id?: string
          is_primary?: boolean
          path_id: string
          start_unit_id?: string | null
          started_at?: string
          student_id: string
          target?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_level_id?: string | null
          id?: string
          is_primary?: boolean
          path_id?: string
          start_unit_id?: string | null
          started_at?: string
          student_id?: string
          target?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_current_level_id_fkey"
            columns: ["current_level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_start_unit_id_fkey"
            columns: ["start_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          availability_ye: string
          code: string
          created_at: string
          fee_note: string
          locations: string
          name: string
          official_practice_url: string | null
          payment_note: string
          position: number
          score_scale: string
          summary: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          availability_ye?: string
          code: string
          created_at?: string
          fee_note?: string
          locations?: string
          name: string
          official_practice_url?: string | null
          payment_note?: string
          position?: number
          score_scale?: string
          summary?: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          availability_ye?: string
          code?: string
          created_at?: string
          fee_note?: string
          locations?: string
          name?: string
          official_practice_url?: string | null
          payment_note?: string
          position?: number
          score_scale?: string
          summary?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      governorates: {
        Row: {
          code: string
          created_at: string
          name_ar: string
          position: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          name_ar: string
          position: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          name_ar?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      lesson_blocks: {
        Row: {
          created_at: string
          data: Json
          id: string
          lesson_id: string
          position: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          lesson_id: string
          position: number
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          lesson_id?: string
          position?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_blocks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          rating: string | null
          status: string
          student_id: string
          synced_at: string | null
          updated_at: string
          video_position_sec: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          rating?: string | null
          status?: string
          student_id: string
          synced_at?: string | null
          updated_at?: string
          video_position_sec?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          rating?: string | null
          status?: string
          student_id?: string
          synced_at?: string | null
          updated_at?: string
          video_position_sec?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          archived: boolean
          blocks: Json
          created_at: string
          est_minutes: number | null
          id: string
          item_key: string | null
          position: number
          review_note: string | null
          review_status: string
          skill: string
          speaking_task: Json | null
          title: string
          unit_id: string
          updated_at: string
          writing_task: Json | null
        }
        Insert: {
          archived?: boolean
          blocks?: Json
          created_at?: string
          est_minutes?: number | null
          id?: string
          item_key?: string | null
          position: number
          review_note?: string | null
          review_status?: string
          skill: string
          speaking_task?: Json | null
          title: string
          unit_id: string
          updated_at?: string
          writing_task?: Json | null
        }
        Update: {
          archived?: boolean
          blocks?: Json
          created_at?: string
          est_minutes?: number | null
          id?: string
          item_key?: string | null
          position?: number
          review_note?: string | null
          review_status?: string
          skill?: string
          speaking_task?: Json | null
          title?: string
          unit_id?: string
          updated_at?: string
          writing_task?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          code: string
          created_at: string
          description: string
          est_hours: number | null
          id: string
          kind: string
          path_id: string
          planned_units: number | null
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          est_hours?: number | null
          id?: string
          kind?: string
          path_id: string
          planned_units?: number | null
          position: number
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          est_hours?: number | null
          id?: string
          kind?: string
          path_id?: string
          planned_units?: number | null
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "levels_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "paths"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          student_id: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          student_id: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          student_id?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      path_waitlist: {
        Row: {
          created_at: string
          email: string | null
          id: string
          notified_at: string | null
          path_id: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          notified_at?: string | null
          path_id: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          notified_at?: string | null
          path_id?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "path_waitlist_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "path_waitlist_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      paths: {
        Row: {
          created_at: string
          daily_minutes: number
          description: string
          est_months: number | null
          features: Json
          icon: string
          id: string
          position: number
          published_at: string | null
          slug: string
          status: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_minutes?: number
          description?: string
          est_months?: number | null
          features?: Json
          icon?: string
          id?: string
          position?: number
          published_at?: string | null
          slug: string
          status?: string
          summary?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_minutes?: number
          description?: string
          est_months?: number | null
          features?: Json
          icon?: string
          id?: string
          position?: number
          published_at?: string | null
          slug?: string
          status?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      placement_attempts: {
        Row: {
          completed_at: string | null
          created_at: string
          eta_months: number | null
          id: string
          overall_level: string | null
          path_id: string
          skill_levels: Json | null
          start_unit_id: string | null
          started_at: string
          state: Json
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          eta_months?: number | null
          id?: string
          overall_level?: string | null
          path_id: string
          skill_levels?: Json | null
          start_unit_id?: string | null
          started_at?: string
          state: Json
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          eta_months?: number | null
          id?: string
          overall_level?: string | null
          path_id?: string
          skill_levels?: Json | null
          start_unit_id?: string | null
          started_at?: string
          state?: Json
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "placement_attempts_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_attempts_start_unit_id_fkey"
            columns: ["start_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_questions: {
        Row: {
          answer: number
          archived: boolean
          created_at: string
          id: string
          item: Json
          item_key: string
          level: string
          path_id: string
          position: number
          skill: string
          updated_at: string
        }
        Insert: {
          answer: number
          archived?: boolean
          created_at?: string
          id?: string
          item: Json
          item_key: string
          level: string
          path_id: string
          position: number
          skill: string
          updated_at?: string
        }
        Update: {
          answer?: number
          archived?: boolean
          created_at?: string
          id?: string
          item?: Json
          item_key?: string
          level?: string
          path_id?: string
          position?: number
          skill?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "placement_questions_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "paths"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_date: string | null
          city: string | null
          created_at: string
          daily_goal_minutes: number
          data_saver: boolean
          email: string | null
          full_name: string
          governorate: string | null
          grade: number | null
          id: string
          last_active_at: string | null
          phone: string | null
          primary_path_id: string | null
          role: string
          school: string | null
          status: string
          streak_days: number
          stream: string | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          city?: string | null
          created_at?: string
          daily_goal_minutes?: number
          data_saver?: boolean
          email?: string | null
          full_name?: string
          governorate?: string | null
          grade?: number | null
          id: string
          last_active_at?: string | null
          phone?: string | null
          primary_path_id?: string | null
          role?: string
          school?: string | null
          status?: string
          streak_days?: number
          stream?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          city?: string | null
          created_at?: string
          daily_goal_minutes?: number
          data_saver?: boolean
          email?: string | null
          full_name?: string
          governorate?: string | null
          grade?: number | null
          id?: string
          last_active_at?: string | null
          phone?: string | null
          primary_path_id?: string | null
          role?: string
          school?: string | null
          status?: string
          streak_days?: number
          stream?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_governorate_fkey"
            columns: ["governorate"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profiles_primary_path_id_fkey"
            columns: ["primary_path_id"]
            isOneToOne: false
            referencedRelation: "paths"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json
          client_created_at: string | null
          client_id: string | null
          correct: number
          created_at: string
          id: string
          passed: boolean
          quiz_id: string
          results: Json
          score: number
          student_id: string
          submitted_offline: boolean
          total: number
          updated_at: string
        }
        Insert: {
          answers: Json
          client_created_at?: string | null
          client_id?: string | null
          correct: number
          created_at?: string
          id?: string
          passed: boolean
          quiz_id: string
          results: Json
          score: number
          student_id: string
          submitted_offline?: boolean
          total: number
          updated_at?: string
        }
        Update: {
          answers?: Json
          client_created_at?: string | null
          client_id?: string | null
          correct?: number
          created_at?: string
          id?: string
          passed?: boolean
          quiz_id?: string
          results?: Json
          score?: number
          student_id?: string
          submitted_offline?: boolean
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_keys: {
        Row: {
          created_at: string
          questions: Json
          quiz_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          questions?: Json
          quiz_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          questions?: Json
          quiz_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_keys_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: true
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          id: string
          kind: string
          level_id: string | null
          pass_percent: number
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          level_id?: string | null
          pass_percent?: number
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          level_id?: string | null
          pass_percent?: number
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          kind: string
          lesson_id: string | null
          note: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          lesson_id?: string | null
          note?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          lesson_id?: string | null
          note?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      skill_estimates: {
        Row: {
          created_at: string
          level: string
          path_id: string
          skill: string
          source: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          level: string
          path_id: string
          skill: string
          source: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          level?: string
          path_id?: string
          skill?: string
          source?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_estimates_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_estimates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          channel: string
          channel_url: string | null
          created_at: string
          duration_sec: number | null
          end_sec: number | null
          id: string
          last_checked_at: string | null
          start_sec: number | null
          status: string
          title: string
          updated_at: string
          youtube_id: string
        }
        Insert: {
          channel?: string
          channel_url?: string | null
          created_at?: string
          duration_sec?: number | null
          end_sec?: number | null
          id?: string
          last_checked_at?: string | null
          start_sec?: number | null
          status?: string
          title?: string
          updated_at?: string
          youtube_id: string
        }
        Update: {
          channel?: string
          channel_url?: string | null
          created_at?: string
          duration_sec?: number | null
          end_sec?: number | null
          id?: string
          last_checked_at?: string | null
          start_sec?: number | null
          status?: string
          title?: string
          updated_at?: string
          youtube_id?: string
        }
        Relationships: []
      }
      speaking_attempts: {
        Row: {
          created_at: string
          duration_sec: number
          estimated_cefr: string | null
          feedback: Json | null
          id: string
          lesson_id: string
          model: string | null
          prompt_en: string
          prompt_version: string | null
          provider: string | null
          scores: Json | null
          status: string
          student_id: string
          transcript: string
          transcription: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_sec: number
          estimated_cefr?: string | null
          feedback?: Json | null
          id?: string
          lesson_id: string
          model?: string | null
          prompt_en: string
          prompt_version?: string | null
          provider?: string | null
          scores?: Json | null
          status?: string
          student_id: string
          transcript: string
          transcription?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_sec?: number
          estimated_cefr?: string | null
          feedback?: Json | null
          id?: string
          lesson_id?: string
          model?: string | null
          prompt_en?: string
          prompt_version?: string | null
          provider?: string | null
          scores?: Json | null
          status?: string
          student_id?: string
          transcript?: string
          transcription?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaking_attempts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speaking_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_packages: {
        Row: {
          created_at: string
          id: string
          imported_by: string | null
          package: Json
          size_bytes: number
          unit_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          imported_by?: string | null
          package: Json
          size_bytes: number
          unit_id: string
          updated_at?: string
          version: number
        }
        Update: {
          created_at?: string
          id?: string
          imported_by?: string | null
          package?: Json
          size_bytes?: number
          unit_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "unit_packages_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_packages_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          can_do: string
          code: string
          created_at: string
          grammar_point: string
          id: string
          level_id: string
          package_size_bytes: number | null
          position: number
          source_package: Json | null
          status: string
          title: string
          topic: string
          updated_at: string
          version: number
        }
        Insert: {
          can_do?: string
          code: string
          created_at?: string
          grammar_point?: string
          id?: string
          level_id: string
          package_size_bytes?: number | null
          position: number
          source_package?: Json | null
          status?: string
          title: string
          topic?: string
          updated_at?: string
          version?: number
        }
        Update: {
          can_do?: string
          code?: string
          created_at?: string
          grammar_point?: string
          id?: string
          level_id?: string
          package_size_bytes?: number | null
          position?: number
          source_package?: Json | null
          status?: string
          title?: string
          topic?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "units_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_items: {
        Row: {
          archived: boolean
          created_at: string
          example_ar: string | null
          example_en: string
          id: string
          ipa: string | null
          item_key: string
          meaning_ar: string
          part_of_speech: string
          position: number
          unit_id: string
          updated_at: string
          word: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          example_ar?: string | null
          example_en: string
          id?: string
          ipa?: string | null
          item_key: string
          meaning_ar: string
          part_of_speech: string
          position: number
          unit_id: string
          updated_at?: string
          word: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          example_ar?: string | null
          example_en?: string
          id?: string
          ipa?: string | null
          item_key?: string
          meaning_ar?: string
          part_of_speech?: string
          position?: number
          unit_id?: string
          updated_at?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_reviews: {
        Row: {
          created_at: string
          due_at: string
          ease: number
          id: string
          interval_days: number
          lapses: number
          last_result: string | null
          last_reviewed_at: string | null
          repetitions: number
          review_count: number
          student_id: string
          updated_at: string
          vocab_item_id: string
        }
        Insert: {
          created_at?: string
          due_at?: string
          ease?: number
          id?: string
          interval_days?: number
          lapses?: number
          last_result?: string | null
          last_reviewed_at?: string | null
          repetitions?: number
          review_count?: number
          student_id: string
          updated_at?: string
          vocab_item_id: string
        }
        Update: {
          created_at?: string
          due_at?: string
          ease?: number
          id?: string
          interval_days?: number
          lapses?: number
          last_result?: string | null
          last_reviewed_at?: string | null
          repetitions?: number
          review_count?: number
          student_id?: string
          updated_at?: string
          vocab_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_reviews_vocab_item_id_fkey"
            columns: ["vocab_item_id"]
            isOneToOne: false
            referencedRelation: "vocab_items"
            referencedColumns: ["id"]
          },
        ]
      }
      writing_submissions: {
        Row: {
          client_id: string | null
          created_at: string
          estimated_cefr: string | null
          evaluated_at: string | null
          feedback: Json | null
          id: string
          lesson_id: string
          model: string | null
          parent_id: string | null
          prompt_en: string
          prompt_version: string | null
          provider: string | null
          scores: Json | null
          status: string
          student_id: string
          text: string
          updated_at: string
          version: number
          word_count: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          estimated_cefr?: string | null
          evaluated_at?: string | null
          feedback?: Json | null
          id?: string
          lesson_id: string
          model?: string | null
          parent_id?: string | null
          prompt_en: string
          prompt_version?: string | null
          provider?: string | null
          scores?: Json | null
          status?: string
          student_id: string
          text: string
          updated_at?: string
          version?: number
          word_count: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          estimated_cefr?: string | null
          evaluated_at?: string | null
          feedback?: Json | null
          id?: string
          lesson_id?: string
          model?: string | null
          parent_id?: string | null
          prompt_en?: string
          prompt_version?: string | null
          provider?: string | null
          scores?: Json | null
          status?: string
          student_id?: string
          text?: string
          updated_at?: string
          version?: number
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "writing_submissions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "writing_submissions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "writing_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "writing_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_quiz: { Args: { p_quiz_id: string }; Returns: Json }
      import_placement_bank: {
        Args: { p_bank: Json; p_path_slug: string }
        Returns: number
      }
      import_unit_package: { Args: { p_package: Json }; Returns: string }
      is_active_member: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      notify_path_waitlist: { Args: { p_path_id: string }; Returns: string[] }
      publish_unit: { Args: { p_unit_id: string }; Returns: undefined }
      review_application: {
        Args: { p_application_id: string; p_decision: string; p_note?: string }
        Returns: Json
      }
      submit_application: {
        Args: { p_guardian_consent: boolean; p_privacy_consent: boolean }
        Returns: string
      }
      submit_quiz: {
        Args: {
          p_answers: Json
          p_client_created_at?: string
          p_client_id?: string
          p_offline?: boolean
          p_quiz_id: string
        }
        Returns: string
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
