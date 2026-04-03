
-- Create AI history preferences table for storage management
CREATE TABLE public.ai_history_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  feature_type VARCHAR NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  retention_days INTEGER DEFAULT 90,
  storage_budget_mb INTEGER DEFAULT 50,
  auto_cleanup BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, feature_type)
);

-- Enable RLS
ALTER TABLE public.ai_history_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own history preferences" 
ON public.ai_history_preferences 
FOR ALL 
USING (auth.uid() = user_id);

-- Create storage usage tracking table
CREATE TABLE public.storage_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  category VARCHAR NOT NULL,
  storage_bytes BIGINT NOT NULL DEFAULT 0,
  record_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, category)
);

-- Enable RLS
ALTER TABLE public.storage_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own storage analytics" 
ON public.storage_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage storage analytics" 
ON public.storage_analytics 
FOR ALL 
USING (auth.uid() = user_id);

-- Add trigger to update timestamps
CREATE OR REPLACE FUNCTION update_ai_history_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_history_preferences_timestamp
    BEFORE UPDATE ON public.ai_history_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_history_preferences_timestamp();

-- Function to calculate database storage usage
CREATE OR REPLACE FUNCTION public.calculate_database_storage_usage(_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _result JSON;
    _total_bytes BIGINT := 0;
    _category_stats JSON;
BEGIN
    -- Calculate storage by category
    WITH storage_by_table AS (
        SELECT 
            'quiz_sessions' as category,
            COALESCE(SUM(pg_column_size(to_jsonb(quiz_sessions.*))), 0) as bytes,
            COUNT(*) as records
        FROM quiz_sessions WHERE user_id = _user_id
        UNION ALL
        SELECT 
            'chat_sessions' as category,
            COALESCE(SUM(pg_column_size(to_jsonb(ai_chat_sessions.*))), 0) as bytes,
            COUNT(*) as records
        FROM ai_chat_sessions WHERE user_id = _user_id
        UNION ALL
        SELECT 
            'chat_messages' as category,
            COALESCE(SUM(pg_column_size(to_jsonb(ai_chat_messages.*))), 0) as bytes,
            COUNT(*) as records
        FROM ai_chat_messages WHERE user_id = _user_id
        UNION ALL
        SELECT 
            'note_enhancements' as category,
            COALESCE(SUM(pg_column_size(to_jsonb(note_enhancements.*))), 0) as bytes,
            COUNT(*) as records
        FROM note_enhancements WHERE user_id = _user_id
        UNION ALL
        SELECT 
            'concept_learning' as category,
            COALESCE(SUM(pg_column_size(to_jsonb(concept_learning_sessions.*))), 0) as bytes,
            COUNT(*) as records
        FROM concept_learning_sessions WHERE user_id = _user_id
        UNION ALL
        SELECT 
            'document_analyses' as category,
            COALESCE(SUM(pg_column_size(to_jsonb(document_analyses.*))), 0) as bytes,
            COUNT(*) as records
        FROM document_analyses WHERE user_id = _user_id
        UNION ALL
        SELECT 
            'usage_tracking' as category,
            COALESCE(SUM(pg_column_size(to_jsonb(ai_usage_tracking.*))), 0) as bytes,
            COUNT(*) as records
        FROM ai_usage_tracking WHERE user_id = _user_id
    )
    SELECT 
        json_agg(
            json_build_object(
                'category', category,
                'bytes', bytes,
                'records', records,
                'size_formatted', CASE 
                    WHEN bytes < 1024 THEN bytes || ' B'
                    WHEN bytes < 1048576 THEN ROUND(bytes / 1024.0, 1) || ' KB'
                    WHEN bytes < 1073741824 THEN ROUND(bytes / 1048576.0, 1) || ' MB'
                    ELSE ROUND(bytes / 1073741824.0, 2) || ' GB'
                END
            )
        ),
        SUM(bytes)
    INTO _category_stats, _total_bytes
    FROM storage_by_table;
    
    _result := json_build_object(
        'total_bytes', _total_bytes,
        'total_formatted', CASE 
            WHEN _total_bytes < 1024 THEN _total_bytes || ' B'
            WHEN _total_bytes < 1048576 THEN ROUND(_total_bytes / 1024.0, 1) || ' KB'
            WHEN _total_bytes < 1073741824 THEN ROUND(_total_bytes / 1048576.0, 1) || ' MB'
            ELSE ROUND(_total_bytes / 1073741824.0, 2) || ' GB'
        END,
        'categories', _category_stats,
        'calculated_at', NOW()
    );
    
    RETURN _result;
END;
$$;
