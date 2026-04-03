-- Phase 1: AI-Powered Document Analysis - Database Extensions

-- Create AI service configurations table
CREATE TABLE public.ai_service_configs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    service_name VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'gemini', etc.
    api_key_encrypted TEXT, -- Store encrypted API keys
    model_name VARCHAR(100) DEFAULT 'gpt-4o-mini',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT ai_service_configs_user_service_unique UNIQUE (user_id, service_name)
);

-- Create document analysis table
CREATE TABLE public.document_analyses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID NOT NULL,
    user_id UUID NOT NULL,
    analysis_type VARCHAR(50) NOT NULL, -- 'summary', 'key_points', 'questions', 'concepts'
    ai_service VARCHAR(50) NOT NULL,
    model_used VARCHAR(100) NOT NULL,
    prompt_used TEXT,
    analysis_result JSONB NOT NULL,
    confidence_score FLOAT,
    processing_time_ms INTEGER,
    token_usage JSONB, -- Store input/output token counts
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT document_analyses_file_id_fkey 
        FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE,
    CONSTRAINT document_analyses_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create AI chat sessions table
CREATE TABLE public.ai_chat_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    session_name VARCHAR(200) DEFAULT 'New Chat Session',
    ai_service VARCHAR(50) NOT NULL,
    model_used VARCHAR(100) NOT NULL,
    system_prompt TEXT,
    total_messages INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT ai_chat_sessions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create AI chat messages table
CREATE TABLE public.ai_chat_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}', -- Store file references, timestamps, etc.
    token_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT ai_chat_messages_session_id_fkey 
        FOREIGN KEY (session_id) REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
    CONSTRAINT ai_chat_messages_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create AI usage tracking table
CREATE TABLE public.ai_usage_tracking (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    service_name VARCHAR(50) NOT NULL,
    operation_type VARCHAR(50) NOT NULL, -- 'analysis', 'chat', 'summary', etc.
    tokens_used INTEGER NOT NULL,
    cost_estimate DECIMAL(10,6), -- Store estimated cost in USD
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT ai_usage_tracking_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on all AI tables
ALTER TABLE public.ai_service_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_service_configs
CREATE POLICY "Users can manage their own AI service configs" ON public.ai_service_configs
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for document_analyses
CREATE POLICY "Users can view their own document analyses" ON public.document_analyses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create document analyses for their files" ON public.document_analyses
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        EXISTS (SELECT 1 FROM public.files WHERE id = file_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can update their own document analyses" ON public.document_analyses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document analyses" ON public.document_analyses
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for ai_chat_sessions
CREATE POLICY "Users can manage their own chat sessions" ON public.ai_chat_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for ai_chat_messages
CREATE POLICY "Users can manage their own chat messages" ON public.ai_chat_messages
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for ai_usage_tracking
CREATE POLICY "Users can view their own usage tracking" ON public.ai_usage_tracking
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage tracking" ON public.ai_usage_tracking
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_document_analyses_file_user ON public.document_analyses(file_id, user_id);
CREATE INDEX idx_document_analyses_type_date ON public.document_analyses(analysis_type, created_at);
CREATE INDEX idx_ai_chat_messages_session ON public.ai_chat_messages(session_id, created_at);
CREATE INDEX idx_ai_usage_tracking_user_date ON public.ai_usage_tracking(user_id, date);

-- Create updated_at triggers
CREATE TRIGGER update_ai_service_configs_updated_at
    BEFORE UPDATE ON public.ai_service_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_analyses_updated_at
    BEFORE UPDATE ON public.document_analyses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_chat_sessions_updated_at
    BEFORE UPDATE ON public.ai_chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();