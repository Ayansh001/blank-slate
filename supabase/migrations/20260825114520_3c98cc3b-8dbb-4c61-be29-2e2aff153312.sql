-- ============ EXTENSIONS ============
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============ SHARED TRIGGER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_files_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_ai_history_preferences_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============ TABLES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  username TEXT UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folders TO authenticated;
GRANT ALL ON public.folders TO service_role;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own folders" ON public.folders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own folders" ON public.folders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own folders" ON public.folders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own folders" ON public.folders FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  category TEXT DEFAULT '',
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  thumbnail_path TEXT,
  metadata JSONB DEFAULT '{}',
  version INTEGER DEFAULT 1,
  checksum TEXT,
  ocr_text TEXT,
  ocr_confidence DOUBLE PRECISION,
  ocr_language VARCHAR(10) DEFAULT 'eng',
  ocr_status VARCHAR(20) DEFAULT 'pending',
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT files_ocr_status_check CHECK (ocr_status IN ('pending','processing','completed','failed','skipped'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.files TO authenticated;
GRANT ALL ON public.files TO service_role;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own files" ON public.files FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can upload their own files" ON public.files FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own files" ON public.files FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own files" ON public.files FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Note',
  content TEXT DEFAULT '',
  plain_text TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  category TEXT DEFAULT '',
  word_count INTEGER DEFAULT 0,
  reading_time INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  trashed BOOLEAN DEFAULT FALSE,
  trashed_at TIMESTAMPTZ,
  file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notes" ON public.notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notes" ON public.notes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notes" ON public.notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 0,
  notes_created INTEGER DEFAULT 0,
  words_written INTEGER DEFAULT 0,
  files_uploaded INTEGER DEFAULT 0,
  ai_queries INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own study sessions" ON public.study_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own study sessions" ON public.study_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own study sessions" ON public.study_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own study sessions" ON public.study_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.ocr_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  language VARCHAR(10) DEFAULT 'eng',
  preprocessing_options JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocr_jobs TO authenticated;
GRANT ALL ON public.ocr_jobs TO service_role;
ALTER TABLE public.ocr_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own OCR jobs" ON public.ocr_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own OCR jobs" ON public.ocr_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own OCR jobs" ON public.ocr_jobs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own OCR jobs" ON public.ocr_jobs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.ocr_orchestration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  total_pages INTEGER NOT NULL,
  total_chunks INTEGER NOT NULL,
  chunks_completed INTEGER DEFAULT 0,
  chunks_failed INTEGER DEFAULT 0,
  chunks_pending INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  progress_percentage INTEGER DEFAULT 0,
  processing_strategy JSONB DEFAULT '{}',
  final_ocr_text TEXT,
  final_confidence DOUBLE PRECISION,
  estimated_completion_time TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocr_orchestration TO authenticated;
GRANT ALL ON public.ocr_orchestration TO service_role;
ALTER TABLE public.ocr_orchestration ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own OCR orchestration" ON public.ocr_orchestration FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own OCR orchestration" ON public.ocr_orchestration FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own OCR orchestration" ON public.ocr_orchestration FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own OCR orchestration" ON public.ocr_orchestration FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.ocr_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_job_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL,
  total_chunks INTEGER NOT NULL,
  start_page INTEGER NOT NULL,
  end_page INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  ocr_text TEXT,
  ocr_confidence DOUBLE PRECISION,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocr_chunks TO authenticated;
GRANT ALL ON public.ocr_chunks TO service_role;
ALTER TABLE public.ocr_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own OCR chunks" ON public.ocr_chunks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ocr_orchestration o WHERE o.id = parent_job_id AND o.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.ocr_jobs j WHERE j.id = parent_job_id AND j.user_id = auth.uid()));
CREATE POLICY "Users can create their own OCR chunks" ON public.ocr_chunks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.ocr_orchestration o WHERE o.id = parent_job_id AND o.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.ocr_jobs j WHERE j.id = parent_job_id AND j.user_id = auth.uid()));
CREATE POLICY "Users can update their own OCR chunks" ON public.ocr_chunks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ocr_orchestration o WHERE o.id = parent_job_id AND o.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.ocr_jobs j WHERE j.id = parent_job_id AND j.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ocr_orchestration o WHERE o.id = parent_job_id AND o.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.ocr_jobs j WHERE j.id = parent_job_id AND j.user_id = auth.uid()));
CREATE POLICY "Users can delete their own OCR chunks" ON public.ocr_chunks FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ocr_orchestration o WHERE o.id = parent_job_id AND o.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.ocr_jobs j WHERE j.id = parent_job_id AND j.user_id = auth.uid()));

CREATE TABLE public.ai_service_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name VARCHAR(50) NOT NULL,
  api_key TEXT,
  model_name VARCHAR(100) DEFAULT 'gpt-4o-mini',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ai_service_configs_user_service_unique UNIQUE (user_id, service_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_service_configs TO authenticated;
GRANT ALL ON public.ai_service_configs TO service_role;
ALTER TABLE public.ai_service_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own AI configs" ON public.ai_service_configs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own AI configs" ON public.ai_service_configs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own AI configs" ON public.ai_service_configs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own AI configs" ON public.ai_service_configs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.document_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL,
  ai_service VARCHAR(50) NOT NULL,
  model_used VARCHAR(100) NOT NULL,
  prompt_used TEXT,
  analysis_result JSONB NOT NULL,
  confidence_score DOUBLE PRECISION,
  processing_time_ms INTEGER,
  token_usage JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_analyses TO authenticated;
GRANT ALL ON public.document_analyses TO service_role;
ALTER TABLE public.document_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own document analyses" ON public.document_analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own document analyses" ON public.document_analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own document analyses" ON public.document_analyses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own document analyses" ON public.document_analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.ai_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_name VARCHAR(200) DEFAULT 'New Chat Session',
  session_type VARCHAR(50) NOT NULL DEFAULT 'general',
  ai_service VARCHAR(50) NOT NULL,
  model_used VARCHAR(100) NOT NULL,
  system_prompt TEXT,
  total_messages INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_sessions TO authenticated;
GRANT ALL ON public.ai_chat_sessions TO service_role;
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own chat sessions" ON public.ai_chat_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own chat sessions" ON public.ai_chat_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own chat sessions" ON public.ai_chat_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own chat sessions" ON public.ai_chat_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.ai_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_messages TO authenticated;
GRANT ALL ON public.ai_chat_messages TO service_role;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own chat messages" ON public.ai_chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own chat messages" ON public.ai_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own chat messages" ON public.ai_chat_messages FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own chat messages" ON public.ai_chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.ai_usage_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name VARCHAR(50) NOT NULL,
  operation_type VARCHAR(50) NOT NULL,
  tokens_used INTEGER NOT NULL,
  cost_estimate NUMERIC(10,6),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_usage_tracking TO authenticated;
GRANT ALL ON public.ai_usage_tracking TO service_role;
ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own usage" ON public.ai_usage_tracking FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own usage" ON public.ai_usage_tracking FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own usage" ON public.ai_usage_tracking FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own usage" ON public.ai_usage_tracking FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.quiz_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE,
  quiz_type VARCHAR(50) NOT NULL,
  questions JSONB NOT NULL,
  answers JSONB DEFAULT '{}',
  score DOUBLE PRECISION,
  time_spent_minutes INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  ai_service VARCHAR(50) NOT NULL,
  model_used VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_sessions TO authenticated;
GRANT ALL ON public.quiz_sessions TO service_role;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own quiz sessions" ON public.quiz_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own quiz sessions" ON public.quiz_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own quiz sessions" ON public.quiz_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own quiz sessions" ON public.quiz_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.advanced_quiz_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}',
  questions JSONB NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  detailed_results JSONB NOT NULL DEFAULT '{}',
  score DOUBLE PRECISION,
  time_spent_minutes INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  ai_service VARCHAR(50) NOT NULL,
  model_used VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advanced_quiz_sessions TO authenticated;
GRANT ALL ON public.advanced_quiz_sessions TO service_role;
ALTER TABLE public.advanced_quiz_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own advanced quizzes" ON public.advanced_quiz_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own advanced quizzes" ON public.advanced_quiz_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own advanced quizzes" ON public.advanced_quiz_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own advanced quizzes" ON public.advanced_quiz_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.note_enhancements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE,
  file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
  session_id UUID,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enhancement_type VARCHAR(50) NOT NULL,
  original_content TEXT NOT NULL,
  enhanced_content JSONB NOT NULL,
  ai_service VARCHAR(50) NOT NULL,
  model_used VARCHAR(100) NOT NULL,
  confidence_score DOUBLE PRECISION DEFAULT 0.8,
  is_applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_enhancements TO authenticated;
GRANT ALL ON public.note_enhancements TO service_role;
ALTER TABLE public.note_enhancements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own note enhancements" ON public.note_enhancements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own note enhancements" ON public.note_enhancements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own note enhancements" ON public.note_enhancements FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own note enhancements" ON public.note_enhancements FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.learning_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  activity_data JSONB NOT NULL,
  performance_score DOUBLE PRECISION,
  time_spent_minutes INTEGER DEFAULT 0,
  knowledge_areas TEXT[] DEFAULT '{}',
  difficulty_level INTEGER DEFAULT 1,
  ai_insights JSONB DEFAULT '{}',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_analytics TO authenticated;
GRANT ALL ON public.learning_analytics TO service_role;
ALTER TABLE public.learning_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own learning analytics" ON public.learning_analytics FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own learning analytics" ON public.learning_analytics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own learning analytics" ON public.learning_analytics FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own learning analytics" ON public.learning_analytics FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.content_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type VARCHAR(20) NOT NULL,
  source_id UUID NOT NULL,
  related_type VARCHAR(20) NOT NULL,
  related_id UUID NOT NULL,
  relationship_type VARCHAR(50) NOT NULL,
  confidence_score DOUBLE PRECISION DEFAULT 0.8,
  ai_explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_relationships TO authenticated;
GRANT ALL ON public.content_relationships TO service_role;
ALTER TABLE public.content_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own content relationships" ON public.content_relationships FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own content relationships" ON public.content_relationships FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own content relationships" ON public.content_relationships FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own content relationships" ON public.content_relationships FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.study_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  target_completion_date DATE,
  priority INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'active',
  progress_percentage INTEGER DEFAULT 0,
  related_files UUID[] DEFAULT '{}',
  related_notes UUID[] DEFAULT '{}',
  milestones JSONB DEFAULT '[]',
  ai_recommendations JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_goals TO authenticated;
GRANT ALL ON public.study_goals TO service_role;
ALTER TABLE public.study_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own study goals" ON public.study_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own study goals" ON public.study_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own study goals" ON public.study_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own study goals" ON public.study_goals FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.study_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  total_days INTEGER NOT NULL,
  hours_per_day INTEGER NOT NULL,
  selected_notes JSONB NOT NULL,
  daily_schedule JSONB NOT NULL,
  progress JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_plans TO authenticated;
GRANT ALL ON public.study_plans TO service_role;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own study plans" ON public.study_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own study plans" ON public.study_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own study plans" ON public.study_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own study plans" ON public.study_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.concept_learning_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  difficulty TEXT DEFAULT 'intermediate',
  mode TEXT DEFAULT 'basic',
  response_data JSONB NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  processing_time INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.concept_learning_sessions TO authenticated;
GRANT ALL ON public.concept_learning_sessions TO service_role;
ALTER TABLE public.concept_learning_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own concept learning sessions" ON public.concept_learning_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own concept learning sessions" ON public.concept_learning_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own concept learning sessions" ON public.concept_learning_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own concept learning sessions" ON public.concept_learning_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.ai_history_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_type VARCHAR NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  retention_days INTEGER DEFAULT 90,
  storage_budget_mb INTEGER DEFAULT 50,
  auto_cleanup BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, feature_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_history_preferences TO authenticated;
GRANT ALL ON public.ai_history_preferences TO service_role;
ALTER TABLE public.ai_history_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own history preferences" ON public.ai_history_preferences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.storage_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR NOT NULL,
  storage_bytes BIGINT NOT NULL DEFAULT 0,
  record_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, category)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.storage_analytics TO authenticated;
GRANT ALL ON public.storage_analytics TO service_role;
ALTER TABLE public.storage_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own storage analytics" ON public.storage_analytics FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  category VARCHAR DEFAULT 'general',
  priority VARCHAR DEFAULT 'normal',
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.ai_daily_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'motivation',
  ai_service TEXT NOT NULL,
  model_used TEXT NOT NULL,
  generated_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_daily_quotes TO authenticated;
GRANT ALL ON public.ai_daily_quotes TO service_role;
ALTER TABLE public.ai_daily_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own daily quotes" ON public.ai_daily_quotes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own daily quotes" ON public.ai_daily_quotes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own daily quotes" ON public.ai_daily_quotes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own daily quotes" ON public.ai_daily_quotes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.daily_quote_preferences (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  preferred_categories TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_quote_preferences TO authenticated;
GRANT ALL ON public.daily_quote_preferences TO service_role;
ALTER TABLE public.daily_quote_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own quote preferences" ON public.daily_quote_preferences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ INDEXES ============
CREATE INDEX idx_files_folder_id ON public.files(folder_id);
CREATE INDEX idx_files_tags ON public.files USING GIN(tags);
CREATE INDEX idx_files_user_folder ON public.files(user_id, folder_id);
CREATE INDEX idx_files_ocr_status ON public.files(ocr_status);
CREATE INDEX idx_files_ocr_text ON public.files USING GIN(to_tsvector('english', COALESCE(ocr_text,'')));
CREATE INDEX idx_folders_parent ON public.folders(parent_id);
CREATE INDEX idx_folders_user ON public.folders(user_id);
CREATE INDEX idx_notes_user_id ON public.notes(user_id);
CREATE INDEX idx_ocr_jobs_status ON public.ocr_jobs(status);
CREATE INDEX idx_ocr_jobs_user_id ON public.ocr_jobs(user_id);
CREATE INDEX idx_ocr_jobs_file_user ON public.ocr_jobs(file_id, user_id);
CREATE INDEX idx_ocr_chunks_parent ON public.ocr_chunks(parent_job_id);
CREATE INDEX idx_ocr_orchestration_user ON public.ocr_orchestration(user_id, file_id);
CREATE INDEX idx_ai_chat_messages_session ON public.ai_chat_messages(session_id, created_at);
CREATE INDEX idx_ai_chat_sessions_user_id_updated_at ON public.ai_chat_sessions(user_id, updated_at DESC);
CREATE INDEX idx_quiz_sessions_user ON public.quiz_sessions(user_id, created_at DESC);
CREATE INDEX idx_advanced_quiz_sessions_user ON public.advanced_quiz_sessions(user_id, created_at DESC);
CREATE INDEX idx_note_enhancements_user ON public.note_enhancements(user_id, created_at DESC);
CREATE INDEX idx_learning_analytics_user_date ON public.learning_analytics(user_id, date);
CREATE INDEX idx_ai_usage_tracking_user_date ON public.ai_usage_tracking(user_id, date);
CREATE INDEX idx_ai_daily_quotes_user_date ON public.ai_daily_quotes(user_id, generated_date);
CREATE INDEX idx_ai_daily_quotes_service ON public.ai_daily_quotes(ai_service, generated_date);
CREATE INDEX idx_concept_sessions_user ON public.concept_learning_sessions(user_id, created_at DESC);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- ============ AUTH / PROFILE FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, bio)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
    ''
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NEW.raw_user_meta_data ->> 'full_name', profiles.full_name),
    username = COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.ensure_user_profile(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, bio)
  SELECT au.id,
         COALESCE(au.raw_user_meta_data ->> 'full_name', ''),
         COALESCE(au.raw_user_meta_data ->> 'username', au.email),
         ''
  FROM auth.users au
  WHERE au.id = _user_id
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- ============ APPLICATION FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.track_learning_activity(
  _user_id UUID,
  _activity_type VARCHAR(50),
  _activity_data JSONB,
  _performance_score FLOAT DEFAULT NULL,
  _time_spent_minutes INTEGER DEFAULT 0,
  _knowledge_areas TEXT[] DEFAULT '{}',
  _difficulty_level INTEGER DEFAULT 1
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _activity_id UUID;
BEGIN
  INSERT INTO public.learning_analytics (
    user_id, activity_type, activity_data, performance_score,
    time_spent_minutes, knowledge_areas, difficulty_level
  ) VALUES (
    _user_id, _activity_type, _activity_data, _performance_score,
    _time_spent_minutes, _knowledge_areas, _difficulty_level
  ) RETURNING id INTO _activity_id;
  RETURN _activity_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_daily_quote(
  _user_id uuid,
  _quote_text text,
  _category text,
  _ai_service text,
  _model_used text,
  _generated_date date DEFAULT CURRENT_DATE
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _result json;
  _quote_id uuid;
BEGIN
  INSERT INTO public.ai_daily_quotes (user_id, quote_text, category, ai_service, model_used, generated_date)
  VALUES (_user_id, _quote_text, _category, _ai_service, _model_used, _generated_date)
  RETURNING id INTO _quote_id;

  _result := json_build_object('success', true, 'quote_id', _quote_id, 'user_id', _user_id, 'message', 'Quote inserted successfully');
  RETURN _result;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM, 'sqlstate', SQLSTATE);
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_database_storage_usage(_user_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _result JSON;
  _total_bytes BIGINT := 0;
  _category_stats JSON;
BEGIN
  WITH storage_by_table AS (
    SELECT 'quiz_sessions' AS category, COALESCE(SUM(pg_column_size(to_jsonb(quiz_sessions.*))),0) AS bytes, COUNT(*) AS records FROM public.quiz_sessions WHERE user_id = _user_id
    UNION ALL
    SELECT 'chat_sessions', COALESCE(SUM(pg_column_size(to_jsonb(ai_chat_sessions.*))),0), COUNT(*) FROM public.ai_chat_sessions WHERE user_id = _user_id
    UNION ALL
    SELECT 'chat_messages', COALESCE(SUM(pg_column_size(to_jsonb(ai_chat_messages.*))),0), COUNT(*) FROM public.ai_chat_messages WHERE user_id = _user_id
    UNION ALL
    SELECT 'note_enhancements', COALESCE(SUM(pg_column_size(to_jsonb(note_enhancements.*))),0), COUNT(*) FROM public.note_enhancements WHERE user_id = _user_id
    UNION ALL
    SELECT 'concept_learning', COALESCE(SUM(pg_column_size(to_jsonb(concept_learning_sessions.*))),0), COUNT(*) FROM public.concept_learning_sessions WHERE user_id = _user_id
    UNION ALL
    SELECT 'document_analyses', COALESCE(SUM(pg_column_size(to_jsonb(document_analyses.*))),0), COUNT(*) FROM public.document_analyses WHERE user_id = _user_id
    UNION ALL
    SELECT 'usage_tracking', COALESCE(SUM(pg_column_size(to_jsonb(ai_usage_tracking.*))),0), COUNT(*) FROM public.ai_usage_tracking WHERE user_id = _user_id
  )
  SELECT json_agg(json_build_object(
           'category', category,
           'bytes', bytes,
           'records', records,
           'size_formatted', CASE
             WHEN bytes < 1024 THEN bytes || ' B'
             WHEN bytes < 1048576 THEN ROUND(bytes / 1024.0, 1) || ' KB'
             WHEN bytes < 1073741824 THEN ROUND(bytes / 1048576.0, 1) || ' MB'
             ELSE ROUND(bytes / 1073741824.0, 2) || ' GB' END)),
         COALESCE(SUM(bytes), 0)
    INTO _category_stats, _total_bytes
  FROM storage_by_table;

  _result := json_build_object(
    'total_bytes', _total_bytes,
    'total_formatted', CASE
      WHEN _total_bytes < 1024 THEN _total_bytes || ' B'
      WHEN _total_bytes < 1048576 THEN ROUND(_total_bytes / 1024.0, 1) || ' KB'
      WHEN _total_bytes < 1073741824 THEN ROUND(_total_bytes / 1048576.0, 1) || ' MB'
      ELSE ROUND(_total_bytes / 1073741824.0, 2) || ' GB' END,
    'categories', COALESCE(_category_stats, '[]'::json),
    'calculated_at', NOW()
  );
  RETURN _result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_ocr_status(
  _file_id UUID,
  _user_id UUID,
  _ocr_text TEXT DEFAULT NULL,
  _ocr_confidence FLOAT DEFAULT NULL,
  _ocr_language VARCHAR(10) DEFAULT 'eng',
  _ocr_status VARCHAR(20) DEFAULT 'completed'
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.files
     SET ocr_text = COALESCE(_ocr_text, ocr_text),
         ocr_confidence = COALESCE(_ocr_confidence, ocr_confidence),
         ocr_language = COALESCE(_ocr_language, ocr_language),
         ocr_status = _ocr_status,
         updated_at = NOW()
   WHERE id = _file_id AND user_id = _user_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_ocr_status_comprehensive(
  _file_id UUID,
  _user_id UUID,
  _ocr_text TEXT DEFAULT NULL,
  _ocr_confidence FLOAT DEFAULT NULL,
  _ocr_language VARCHAR(10) DEFAULT 'eng',
  _ocr_status VARCHAR(20) DEFAULT 'completed'
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _result JSON;
  _updated_count INTEGER;
BEGIN
  IF _file_id IS NULL OR _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'File ID and User ID are required', 'updated_count', 0);
  END IF;

  UPDATE public.files
     SET ocr_text = COALESCE(_ocr_text, ocr_text),
         ocr_confidence = COALESCE(_ocr_confidence, ocr_confidence),
         ocr_language = COALESCE(_ocr_language, ocr_language),
         ocr_status = _ocr_status,
         updated_at = NOW()
   WHERE id = _file_id AND user_id = _user_id;

  GET DIAGNOSTICS _updated_count = ROW_COUNT;

  _result := json_build_object('success', _updated_count > 0, 'updated_count', _updated_count,
                               'file_id', _file_id, 'user_id', _user_id, 'ocr_status', _ocr_status);
  IF _updated_count = 0 THEN
    _result := _result::jsonb || jsonb_build_object('error', 'No file found or permission denied');
  END IF;
  RETURN _result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_ocr_status_simple(
  _file_id UUID,
  _user_id UUID,
  _ocr_text TEXT DEFAULT NULL,
  _ocr_confidence FLOAT DEFAULT NULL,
  _ocr_language VARCHAR(10) DEFAULT 'eng',
  _ocr_status VARCHAR(20) DEFAULT 'completed'
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _updated_count INTEGER;
BEGIN
  UPDATE public.files
     SET ocr_text = COALESCE(_ocr_text, ocr_text),
         ocr_confidence = COALESCE(_ocr_confidence, ocr_confidence),
         ocr_language = COALESCE(_ocr_language, ocr_language),
         ocr_status = _ocr_status,
         updated_at = NOW()
   WHERE id = _file_id AND user_id = _user_id;
  GET DIAGNOSTICS _updated_count = ROW_COUNT;
  RETURN json_build_object('success', _updated_count > 0, 'updated_count', _updated_count, 'file_id', _file_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_ocr_status_enhanced(
  _file_id UUID,
  _user_id UUID,
  _ocr_text TEXT DEFAULT NULL,
  _ocr_confidence FLOAT DEFAULT NULL,
  _ocr_language VARCHAR(10) DEFAULT 'eng',
  _ocr_status VARCHAR(20) DEFAULT 'completed',
  _processing_metadata JSONB DEFAULT '{}'
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _updated_count INTEGER;
BEGIN
  UPDATE public.files
     SET ocr_text = COALESCE(_ocr_text, ocr_text),
         ocr_confidence = COALESCE(_ocr_confidence, ocr_confidence),
         ocr_language = COALESCE(_ocr_language, ocr_language),
         ocr_status = _ocr_status,
         metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(_processing_metadata, '{}'::jsonb),
         updated_at = NOW()
   WHERE id = _file_id AND user_id = _user_id;
  GET DIAGNOSTICS _updated_count = ROW_COUNT;
  RETURN json_build_object('success', _updated_count > 0, 'updated_count', _updated_count,
                           'file_id', _file_id, 'ocr_status', _ocr_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_ocr_jobs()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _deleted_count INTEGER;
BEGIN
  DELETE FROM public.ocr_jobs WHERE file_id NOT IN (SELECT id FROM public.files);
  GET DIAGNOSTICS _deleted_count = ROW_COUNT;

  UPDATE public.ocr_jobs
     SET status = 'failed',
         error_message = 'Job timed out - exceeded maximum processing time',
         completed_at = NOW(),
         updated_at = NOW()
   WHERE status = 'processing' AND started_at < NOW() - INTERVAL '1 hour';

  RETURN _deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_stale_ocr_jobs()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _count INTEGER;
BEGIN
  UPDATE public.ocr_jobs
     SET status = 'failed', error_message = 'Job timed out', completed_at = NOW(), updated_at = NOW()
   WHERE status IN ('pending','processing') AND created_at < NOW() - INTERVAL '1 hour';
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_ocr_jobs_simple()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _count INTEGER;
BEGIN
  DELETE FROM public.ocr_jobs
   WHERE status IN ('completed','failed','cancelled') AND updated_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_stale_ocr_jobs_enhanced()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _failed INTEGER;
  _deleted INTEGER;
BEGIN
  UPDATE public.ocr_jobs
     SET status = 'failed', error_message = 'Job timed out', completed_at = NOW(), updated_at = NOW()
   WHERE status IN ('pending','processing') AND created_at < NOW() - INTERVAL '1 hour';
  GET DIAGNOSTICS _failed = ROW_COUNT;

  DELETE FROM public.ocr_jobs WHERE file_id NOT IN (SELECT id FROM public.files);
  GET DIAGNOSTICS _deleted = ROW_COUNT;

  RETURN json_build_object('success', true, 'failed_jobs', _failed, 'deleted_jobs', _deleted, 'cleaned_at', NOW());
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_stale_ocr_jobs_unlimited()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _failed INTEGER;
  _chunks INTEGER;
BEGIN
  UPDATE public.ocr_jobs
     SET status = 'failed', error_message = 'Job timed out', completed_at = NOW(), updated_at = NOW()
   WHERE status IN ('pending','processing');
  GET DIAGNOSTICS _failed = ROW_COUNT;

  UPDATE public.ocr_chunks
     SET status = 'failed', error_message = 'Parent job cleaned up', updated_at = NOW()
   WHERE status IN ('pending','processing');
  GET DIAGNOSTICS _chunks = ROW_COUNT;

  RETURN json_build_object('success', true, 'failed_jobs', _failed, 'failed_chunks', _chunks, 'cleaned_at', NOW());
END;
$$;

CREATE OR REPLACE FUNCTION public.initialize_chunked_ocr(
  _file_id UUID,
  _user_id UUID,
  _total_pages INTEGER,
  _chunk_size INTEGER DEFAULT 10,
  _language TEXT DEFAULT 'eng',
  _processing_options JSONB DEFAULT '{}'
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _orchestration_id UUID;
  _total_chunks INTEGER;
BEGIN
  _total_chunks := GREATEST(1, CEIL(_total_pages::numeric / GREATEST(_chunk_size, 1))::INTEGER);

  INSERT INTO public.ocr_orchestration (
    user_id, file_id, total_pages, total_chunks, chunks_pending,
    status, processing_strategy, started_at
  ) VALUES (
    _user_id, _file_id, _total_pages, _total_chunks, _total_chunks,
    'pending',
    COALESCE(_processing_options, '{}'::jsonb) || jsonb_build_object('chunk_size', _chunk_size, 'language', _language),
    NOW()
  ) RETURNING id INTO _orchestration_id;

  INSERT INTO public.ocr_chunks (parent_job_id, chunk_index, total_chunks, start_page, end_page, status)
  SELECT _orchestration_id,
         i,
         _total_chunks,
         ((i - 1) * _chunk_size) + 1,
         LEAST(i * _chunk_size, _total_pages),
         'pending'
  FROM generate_series(1, _total_chunks) AS i;

  RETURN _orchestration_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_ocr_chunk_job(
  _file_id UUID,
  _user_id UUID,
  _chunk_index INTEGER,
  _total_chunks INTEGER,
  _language TEXT DEFAULT 'eng',
  _processing_type TEXT DEFAULT 'standard',
  _chunk_metadata JSONB DEFAULT '{}'
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _job_id UUID;
BEGIN
  INSERT INTO public.ocr_jobs (file_id, user_id, status, language, preprocessing_options)
  VALUES (
    _file_id, _user_id, 'pending', _language,
    COALESCE(_chunk_metadata, '{}'::jsonb) || jsonb_build_object(
      'chunk_index', _chunk_index,
      'total_chunks', _total_chunks,
      'processing_type', _processing_type
    )
  ) RETURNING id INTO _job_id;

  RETURN _job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_chunk_progress(
  _orchestration_id UUID,
  _chunk_id UUID,
  _status TEXT,
  _ocr_text TEXT DEFAULT NULL,
  _confidence FLOAT DEFAULT NULL,
  _error_message TEXT DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _completed INTEGER;
  _failed INTEGER;
  _pending INTEGER;
  _total INTEGER;
BEGIN
  UPDATE public.ocr_chunks
     SET status = _status,
         ocr_text = COALESCE(_ocr_text, ocr_text),
         ocr_confidence = COALESCE(_confidence, ocr_confidence),
         error_message = _error_message,
         completed_at = CASE WHEN _status IN ('completed','failed') THEN NOW() ELSE completed_at END,
         updated_at = NOW()
   WHERE id = _chunk_id AND parent_job_id = _orchestration_id;

  SELECT COUNT(*) FILTER (WHERE status = 'completed'),
         COUNT(*) FILTER (WHERE status = 'failed'),
         COUNT(*) FILTER (WHERE status NOT IN ('completed','failed')),
         COUNT(*)
    INTO _completed, _failed, _pending, _total
  FROM public.ocr_chunks WHERE parent_job_id = _orchestration_id;

  UPDATE public.ocr_orchestration
     SET chunks_completed = _completed,
         chunks_failed = _failed,
         chunks_pending = _pending,
         progress_percentage = CASE WHEN _total > 0 THEN ((_completed + _failed) * 100 / _total) ELSE 0 END,
         status = CASE WHEN _pending = 0 AND _failed = 0 THEN 'completed'
                       WHEN _pending = 0 THEN 'partial'
                       ELSE 'processing' END,
         completed_at = CASE WHEN _pending = 0 THEN NOW() ELSE completed_at END,
         updated_at = NOW()
   WHERE id = _orchestration_id;

  RETURN json_build_object('success', true, 'completed', _completed, 'failed', _failed,
                           'pending', _pending, 'total', _total);
END;
$$;

CREATE OR REPLACE FUNCTION public.encrypt_api_key(plain_key TEXT, encryption_key TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  RETURN encode(extensions.pgp_sym_encrypt(plain_key, encryption_key), 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION public.update_chat_session_message_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ai_chat_sessions
       SET total_messages = (SELECT COUNT(*) FROM public.ai_chat_messages WHERE session_id = NEW.session_id),
           updated_at = NOW()
     WHERE id = NEW.session_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE public.ai_chat_sessions
       SET total_messages = (SELECT COUNT(*) FROM public.ai_chat_messages WHERE session_id = OLD.session_id),
           updated_at = NOW()
     WHERE id = OLD.session_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- ============ TRIGGERS ============
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_files_updated_at_trigger BEFORE UPDATE ON public.files FOR EACH ROW EXECUTE FUNCTION public.update_files_updated_at();
CREATE TRIGGER update_ocr_jobs_updated_at BEFORE UPDATE ON public.ocr_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ocr_chunks_updated_at BEFORE UPDATE ON public.ocr_chunks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ocr_orchestration_updated_at BEFORE UPDATE ON public.ocr_orchestration FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_service_configs_updated_at BEFORE UPDATE ON public.ai_service_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_chat_sessions_updated_at BEFORE UPDATE ON public.ai_chat_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_document_analyses_updated_at BEFORE UPDATE ON public.document_analyses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_study_goals_updated_at BEFORE UPDATE ON public.study_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_study_plans_updated_at BEFORE UPDATE ON public.study_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_concept_learning_sessions_updated_at BEFORE UPDATE ON public.concept_learning_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_advanced_quiz_sessions_updated_at BEFORE UPDATE ON public.advanced_quiz_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_daily_quotes_updated_at BEFORE UPDATE ON public.ai_daily_quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_quote_preferences_updated_at BEFORE UPDATE ON public.daily_quote_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_history_preferences_timestamp BEFORE UPDATE ON public.ai_history_preferences FOR EACH ROW EXECUTE FUNCTION public.update_ai_history_preferences_timestamp();
CREATE TRIGGER trigger_update_chat_message_count AFTER INSERT OR DELETE ON public.ai_chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_chat_session_message_count();

-- ============ REALTIME (only tables the app subscribes to) ============
ALTER TABLE public.files REPLICA IDENTITY FULL;
ALTER TABLE public.quiz_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.note_enhancements REPLICA IDENTITY FULL;
ALTER TABLE public.ai_chat_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.note_enhancements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_chat_sessions;