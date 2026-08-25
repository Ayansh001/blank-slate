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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      advanced_quiz_sessions: {
        Row: {
          ai_service: string
          answers: Json
          completed: boolean | null
          completed_at: string | null
          config: Json
          created_at: string | null
          detailed_results: Json
          file_id: string | null
          id: string
          model_used: string
          note_id: string | null
          questions: Json
          score: number | null
          time_spent_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_service: string
          answers?: Json
          completed?: boolean | null
          completed_at?: string | null
          config?: Json
          created_at?: string | null
          detailed_results?: Json
          file_id?: string | null
          id?: string
          model_used: string
          note_id?: string | null
          questions?: Json
          score?: number | null
          time_spent_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_service?: string
          answers?: Json
          completed?: boolean | null
          completed_at?: string | null
          config?: Json
          created_at?: string | null
          detailed_results?: Json
          file_id?: string | null
          id?: string
          model_used?: string
          note_id?: string | null
          questions?: Json
          score?: number | null
          time_spent_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advanced_quiz_sessions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advanced_quiz_sessions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          session_id: string
          token_count: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
          token_count?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
          token_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          ai_service: string
          created_at: string | null
          id: string
          model_used: string
          session_name: string | null
          session_type: string
          system_prompt: string | null
          total_messages: number | null
          total_tokens_used: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_service: string
          created_at?: string | null
          id?: string
          model_used: string
          session_name?: string | null
          session_type?: string
          system_prompt?: string | null
          total_messages?: number | null
          total_tokens_used?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_service?: string
          created_at?: string | null
          id?: string
          model_used?: string
          session_name?: string | null
          session_type?: string
          system_prompt?: string | null
          total_messages?: number | null
          total_tokens_used?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_daily_quotes: {
        Row: {
          ai_service: string
          category: string
          created_at: string
          generated_date: string
          id: string
          is_read: boolean
          model_used: string
          quote_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_service: string
          category: string
          created_at?: string
          generated_date?: string
          id?: string
          is_read?: boolean
          model_used: string
          quote_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_service?: string
          category?: string
          created_at?: string
          generated_date?: string
          id?: string
          is_read?: boolean
          model_used?: string
          quote_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_history_preferences: {
        Row: {
          auto_cleanup: boolean | null
          created_at: string | null
          feature_type: string
          id: string
          is_enabled: boolean
          retention_days: number | null
          storage_budget_mb: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_cleanup?: boolean | null
          created_at?: string | null
          feature_type: string
          id?: string
          is_enabled?: boolean
          retention_days?: number | null
          storage_budget_mb?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_cleanup?: boolean | null
          created_at?: string | null
          feature_type?: string
          id?: string
          is_enabled?: boolean
          retention_days?: number | null
          storage_budget_mb?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_service_configs: {
        Row: {
          api_key: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          model_name: string | null
          service_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          model_name?: string | null
          service_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          model_name?: string | null
          service_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_tracking: {
        Row: {
          cost_estimate: number | null
          created_at: string | null
          date: string
          id: string
          operation_type: string
          service_name: string
          tokens_used: number
          user_id: string
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string | null
          date?: string
          id?: string
          operation_type: string
          service_name: string
          tokens_used: number
          user_id: string
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string | null
          date?: string
          id?: string
          operation_type?: string
          service_name?: string
          tokens_used?: number
          user_id?: string
        }
        Relationships: []
      }
      concept_learning_sessions: {
        Row: {
          concept: string
          created_at: string
          difficulty: string | null
          id: string
          mode: string | null
          processing_time: number | null
          response_data: Json
          tokens_used: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          concept: string
          created_at?: string
          difficulty?: string | null
          id?: string
          mode?: string | null
          processing_time?: number | null
          response_data: Json
          tokens_used?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          concept?: string
          created_at?: string
          difficulty?: string | null
          id?: string
          mode?: string | null
          processing_time?: number | null
          response_data?: Json
          tokens_used?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_relationships: {
        Row: {
          ai_explanation: string | null
          confidence_score: number | null
          created_at: string | null
          id: string
          related_id: string
          related_type: string
          relationship_type: string
          source_id: string
          source_type: string
          user_id: string
        }
        Insert: {
          ai_explanation?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          related_id: string
          related_type: string
          relationship_type: string
          source_id: string
          source_type: string
          user_id: string
        }
        Update: {
          ai_explanation?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          related_id?: string
          related_type?: string
          relationship_type?: string
          source_id?: string
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_quote_preferences: {
        Row: {
          created_at: string
          enabled: boolean
          preferred_categories: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          preferred_categories?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          preferred_categories?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_analyses: {
        Row: {
          ai_service: string
          analysis_result: Json
          analysis_type: string
          confidence_score: number | null
          created_at: string | null
          file_id: string
          id: string
          model_used: string
          processing_time_ms: number | null
          prompt_used: string | null
          token_usage: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_service: string
          analysis_result: Json
          analysis_type: string
          confidence_score?: number | null
          created_at?: string | null
          file_id: string
          id?: string
          model_used: string
          processing_time_ms?: number | null
          prompt_used?: string | null
          token_usage?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_service?: string
          analysis_result?: Json
          analysis_type?: string
          confidence_score?: number | null
          created_at?: string | null
          file_id?: string
          id?: string
          model_used?: string
          processing_time_ms?: number | null
          prompt_used?: string | null
          token_usage?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_analyses_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          category: string | null
          checksum: string | null
          file_path: string
          file_size: number
          file_type: string
          folder_id: string | null
          id: string
          metadata: Json | null
          name: string
          ocr_confidence: number | null
          ocr_language: string | null
          ocr_status: string | null
          ocr_text: string | null
          tags: string[] | null
          thumbnail_path: string | null
          updated_at: string | null
          uploaded_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          category?: string | null
          checksum?: string | null
          file_path: string
          file_size: number
          file_type: string
          folder_id?: string | null
          id?: string
          metadata?: Json | null
          name: string
          ocr_confidence?: number | null
          ocr_language?: string | null
          ocr_status?: string | null
          ocr_text?: string | null
          tags?: string[] | null
          thumbnail_path?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          category?: string | null
          checksum?: string | null
          file_path?: string
          file_size?: number
          file_type?: string
          folder_id?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          ocr_confidence?: number | null
          ocr_language?: string | null
          ocr_status?: string | null
          ocr_text?: string | null
          tags?: string[] | null
          thumbnail_path?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_analytics: {
        Row: {
          activity_data: Json
          activity_type: string
          ai_insights: Json | null
          created_at: string | null
          date: string
          difficulty_level: number | null
          id: string
          knowledge_areas: string[] | null
          performance_score: number | null
          time_spent_minutes: number | null
          user_id: string
        }
        Insert: {
          activity_data: Json
          activity_type: string
          ai_insights?: Json | null
          created_at?: string | null
          date?: string
          difficulty_level?: number | null
          id?: string
          knowledge_areas?: string[] | null
          performance_score?: number | null
          time_spent_minutes?: number | null
          user_id: string
        }
        Update: {
          activity_data?: Json
          activity_type?: string
          ai_insights?: Json | null
          created_at?: string | null
          date?: string
          difficulty_level?: number | null
          id?: string
          knowledge_areas?: string[] | null
          performance_score?: number | null
          time_spent_minutes?: number | null
          user_id?: string
        }
        Relationships: []
      }
      note_enhancements: {
        Row: {
          ai_service: string
          confidence_score: number | null
          created_at: string | null
          enhanced_content: Json
          enhancement_type: string
          file_id: string | null
          id: string
          is_applied: boolean | null
          model_used: string
          note_id: string | null
          original_content: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          ai_service: string
          confidence_score?: number | null
          created_at?: string | null
          enhanced_content: Json
          enhancement_type: string
          file_id?: string | null
          id?: string
          is_applied?: boolean | null
          model_used: string
          note_id?: string | null
          original_content: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          ai_service?: string
          confidence_score?: number | null
          created_at?: string | null
          enhanced_content?: Json
          enhancement_type?: string
          file_id?: string | null
          id?: string
          is_applied?: boolean | null
          model_used?: string
          note_id?: string | null
          original_content?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_enhancements_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_enhancements_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          archived: boolean | null
          archived_at: string | null
          category: string | null
          content: string | null
          created_at: string | null
          file_id: string | null
          id: string
          is_favorite: boolean | null
          is_pinned: boolean | null
          plain_text: string | null
          reading_time: number | null
          tags: string[] | null
          title: string
          trashed: boolean | null
          trashed_at: string | null
          updated_at: string | null
          user_id: string
          word_count: number | null
        }
        Insert: {
          archived?: boolean | null
          archived_at?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          file_id?: string | null
          id?: string
          is_favorite?: boolean | null
          is_pinned?: boolean | null
          plain_text?: string | null
          reading_time?: number | null
          tags?: string[] | null
          title?: string
          trashed?: boolean | null
          trashed_at?: string | null
          updated_at?: string | null
          user_id: string
          word_count?: number | null
        }
        Update: {
          archived?: boolean | null
          archived_at?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          file_id?: string | null
          id?: string
          is_favorite?: boolean | null
          is_pinned?: boolean | null
          plain_text?: string | null
          reading_time?: number | null
          tags?: string[] | null
          title?: string
          trashed?: boolean | null
          trashed_at?: string | null
          updated_at?: string | null
          user_id?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          category: string | null
          created_at: string | null
          data: Json | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string
          priority: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          priority?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          priority?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      ocr_chunks: {
        Row: {
          chunk_index: number
          completed_at: string | null
          created_at: string | null
          end_page: number
          error_message: string | null
          id: string
          ocr_confidence: number | null
          ocr_text: string | null
          parent_job_id: string
          processing_time_ms: number | null
          retry_count: number | null
          start_page: number
          started_at: string | null
          status: string | null
          total_chunks: number
          updated_at: string | null
        }
        Insert: {
          chunk_index: number
          completed_at?: string | null
          created_at?: string | null
          end_page: number
          error_message?: string | null
          id?: string
          ocr_confidence?: number | null
          ocr_text?: string | null
          parent_job_id: string
          processing_time_ms?: number | null
          retry_count?: number | null
          start_page: number
          started_at?: string | null
          status?: string | null
          total_chunks: number
          updated_at?: string | null
        }
        Update: {
          chunk_index?: number
          completed_at?: string | null
          created_at?: string | null
          end_page?: number
          error_message?: string | null
          id?: string
          ocr_confidence?: number | null
          ocr_text?: string | null
          parent_job_id?: string
          processing_time_ms?: number | null
          retry_count?: number | null
          start_page?: number
          started_at?: string | null
          status?: string | null
          total_chunks?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      ocr_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          file_id: string
          id: string
          language: string | null
          preprocessing_options: Json | null
          progress: number | null
          started_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_id: string
          id?: string
          language?: string | null
          preprocessing_options?: Json | null
          progress?: number | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_id?: string
          id?: string
          language?: string | null
          preprocessing_options?: Json | null
          progress?: number | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocr_jobs_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_orchestration: {
        Row: {
          chunks_completed: number | null
          chunks_failed: number | null
          chunks_pending: number | null
          completed_at: string | null
          created_at: string | null
          estimated_completion_time: string | null
          file_id: string
          final_confidence: number | null
          final_ocr_text: string | null
          id: string
          processing_strategy: Json | null
          progress_percentage: number | null
          started_at: string | null
          status: string | null
          total_chunks: number
          total_pages: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chunks_completed?: number | null
          chunks_failed?: number | null
          chunks_pending?: number | null
          completed_at?: string | null
          created_at?: string | null
          estimated_completion_time?: string | null
          file_id: string
          final_confidence?: number | null
          final_ocr_text?: string | null
          id?: string
          processing_strategy?: Json | null
          progress_percentage?: number | null
          started_at?: string | null
          status?: string | null
          total_chunks: number
          total_pages: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chunks_completed?: number | null
          chunks_failed?: number | null
          chunks_pending?: number | null
          completed_at?: string | null
          created_at?: string | null
          estimated_completion_time?: string | null
          file_id?: string
          final_confidence?: number | null
          final_ocr_text?: string | null
          id?: string
          processing_strategy?: Json | null
          progress_percentage?: number | null
          started_at?: string | null
          status?: string | null
          total_chunks?: number
          total_pages?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      quiz_sessions: {
        Row: {
          ai_service: string
          answers: Json | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          file_id: string | null
          id: string
          model_used: string
          note_id: string | null
          questions: Json
          quiz_type: string
          score: number | null
          time_spent_minutes: number | null
          user_id: string
        }
        Insert: {
          ai_service: string
          answers?: Json | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          file_id?: string | null
          id?: string
          model_used: string
          note_id?: string | null
          questions: Json
          quiz_type: string
          score?: number | null
          time_spent_minutes?: number | null
          user_id: string
        }
        Update: {
          ai_service?: string
          answers?: Json | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          file_id?: string | null
          id?: string
          model_used?: string
          note_id?: string | null
          questions?: Json
          quiz_type?: string
          score?: number | null
          time_spent_minutes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_analytics: {
        Row: {
          category: string
          id: string
          last_updated: string | null
          record_count: number
          storage_bytes: number
          user_id: string
        }
        Insert: {
          category: string
          id?: string
          last_updated?: string | null
          record_count?: number
          storage_bytes?: number
          user_id: string
        }
        Update: {
          category?: string
          id?: string
          last_updated?: string | null
          record_count?: number
          storage_bytes?: number
          user_id?: string
        }
        Relationships: []
      }
      study_goals: {
        Row: {
          ai_recommendations: Json | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          milestones: Json | null
          priority: number | null
          progress_percentage: number | null
          related_files: string[] | null
          related_notes: string[] | null
          status: string | null
          target_completion_date: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_recommendations?: Json | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          milestones?: Json | null
          priority?: number | null
          progress_percentage?: number | null
          related_files?: string[] | null
          related_notes?: string[] | null
          status?: string | null
          target_completion_date?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_recommendations?: Json | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          milestones?: Json | null
          priority?: number | null
          progress_percentage?: number | null
          related_files?: string[] | null
          related_notes?: string[] | null
          status?: string | null
          target_completion_date?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      study_plans: {
        Row: {
          created_at: string
          daily_schedule: Json
          hours_per_day: number
          id: string
          progress: Json | null
          selected_notes: Json
          title: string
          total_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_schedule: Json
          hours_per_day: number
          id?: string
          progress?: Json | null
          selected_notes: Json
          title: string
          total_days: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_schedule?: Json
          hours_per_day?: number
          id?: string
          progress?: Json | null
          selected_notes?: Json
          title?: string
          total_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          activity_type: string
          ai_queries: number | null
          duration_minutes: number | null
          ended_at: string | null
          files_uploaded: number | null
          id: string
          notes_created: number | null
          started_at: string | null
          user_id: string
          words_written: number | null
        }
        Insert: {
          activity_type: string
          ai_queries?: number | null
          duration_minutes?: number | null
          ended_at?: string | null
          files_uploaded?: number | null
          id?: string
          notes_created?: number | null
          started_at?: string | null
          user_id: string
          words_written?: number | null
        }
        Update: {
          activity_type?: string
          ai_queries?: number | null
          duration_minutes?: number | null
          ended_at?: string | null
          files_uploaded?: number | null
          id?: string
          notes_created?: number | null
          started_at?: string | null
          user_id?: string
          words_written?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_user_id_fkey"
            columns: ["user_id"]
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
      calculate_database_storage_usage: {
        Args: { _user_id: string }
        Returns: Json
      }
      cleanup_ocr_jobs_simple: { Args: never; Returns: number }
      cleanup_orphaned_ocr_jobs: { Args: never; Returns: number }
      cleanup_stale_ocr_jobs: { Args: never; Returns: number }
      cleanup_stale_ocr_jobs_enhanced: { Args: never; Returns: Json }
      cleanup_stale_ocr_jobs_unlimited: { Args: never; Returns: Json }
      create_ocr_chunk_job: {
        Args: {
          _chunk_index: number
          _chunk_metadata?: Json
          _file_id: string
          _language?: string
          _processing_type?: string
          _total_chunks: number
          _user_id: string
        }
        Returns: string
      }
      encrypt_api_key: {
        Args: { encryption_key: string; plain_key: string }
        Returns: string
      }
      ensure_user_profile: { Args: { _user_id: string }; Returns: undefined }
      initialize_chunked_ocr: {
        Args: {
          _chunk_size?: number
          _file_id: string
          _language?: string
          _processing_options?: Json
          _total_pages: number
          _user_id: string
        }
        Returns: string
      }
      insert_daily_quote: {
        Args: {
          _ai_service: string
          _category: string
          _generated_date?: string
          _model_used: string
          _quote_text: string
          _user_id: string
        }
        Returns: Json
      }
      track_learning_activity: {
        Args: {
          _activity_data: Json
          _activity_type: string
          _difficulty_level?: number
          _knowledge_areas?: string[]
          _performance_score?: number
          _time_spent_minutes?: number
          _user_id: string
        }
        Returns: string
      }
      update_chunk_progress: {
        Args: {
          _chunk_id: string
          _confidence?: number
          _error_message?: string
          _ocr_text?: string
          _orchestration_id: string
          _status: string
        }
        Returns: Json
      }
      update_ocr_status:
        | { Args: never; Returns: undefined }
        | {
            Args: {
              _file_id: string
              _ocr_confidence?: number
              _ocr_language?: string
              _ocr_status?: string
              _ocr_text?: string
              _user_id: string
            }
            Returns: boolean
          }
      update_ocr_status_comprehensive: {
        Args: {
          _file_id: string
          _ocr_confidence?: number
          _ocr_language?: string
          _ocr_status?: string
          _ocr_text?: string
          _user_id: string
        }
        Returns: Json
      }
      update_ocr_status_enhanced: {
        Args: {
          _file_id: string
          _ocr_confidence?: number
          _ocr_language?: string
          _ocr_status?: string
          _ocr_text?: string
          _processing_metadata?: Json
          _user_id: string
        }
        Returns: Json
      }
      update_ocr_status_simple: {
        Args: {
          _file_id: string
          _ocr_confidence?: number
          _ocr_language?: string
          _ocr_status?: string
          _ocr_text?: string
          _user_id: string
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
    Enums: {},
  },
} as const
