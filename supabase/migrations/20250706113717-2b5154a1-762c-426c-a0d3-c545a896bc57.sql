-- Comprehensive AI Integration - New Tables for Enhanced Learning Features

-- Create quiz sessions table for tracking quiz attempts and scores
CREATE TABLE public.quiz_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    file_id UUID NULL, -- Optional: link to source file
    note_id UUID NULL, -- Optional: link to source note
    quiz_type VARCHAR(50) NOT NULL, -- 'multiple_choice', 'true_false', 'essay', 'flashcard'
    questions JSONB NOT NULL, -- Store generated questions
    answers JSONB DEFAULT '{}', -- Store user answers
    score FLOAT DEFAULT NULL, -- Percentage score
    time_spent_minutes INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    ai_service VARCHAR(50) NOT NULL,
    model_used VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    CONSTRAINT quiz_sessions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT quiz_sessions_file_id_fkey 
        FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE,
    CONSTRAINT quiz_sessions_note_id_fkey 
        FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE
);

-- Create learning analytics table for tracking study patterns and progress
CREATE TABLE public.learning_analytics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    activity_type VARCHAR(50) NOT NULL, -- 'study_session', 'quiz_taken', 'note_created', 'file_analyzed'
    activity_data JSONB NOT NULL, -- Flexible data storage for different activity types
    performance_score FLOAT DEFAULT NULL, -- Score for measurable activities
    time_spent_minutes INTEGER DEFAULT 0,
    knowledge_areas TEXT[] DEFAULT '{}', -- Subject/topic tags
    difficulty_level INTEGER DEFAULT 1, -- 1-5 scale
    ai_insights JSONB DEFAULT '{}', -- AI-generated insights about the activity
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT learning_analytics_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create content relationships table for mapping connections between materials
CREATE TABLE public.content_relationships (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    source_type VARCHAR(20) NOT NULL, -- 'file', 'note'
    source_id UUID NOT NULL,
    related_type VARCHAR(20) NOT NULL, -- 'file', 'note'
    related_id UUID NOT NULL,
    relationship_type VARCHAR(50) NOT NULL, -- 'similar_topic', 'references', 'builds_upon', 'contradicts'
    confidence_score FLOAT DEFAULT 0.8, -- AI confidence in the relationship
    ai_explanation TEXT, -- AI explanation of the relationship
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT content_relationships_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create study goals table for user-defined learning objectives
CREATE TABLE public.study_goals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    target_completion_date DATE,
    priority INTEGER DEFAULT 1, -- 1-5 scale
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'paused', 'cancelled'
    progress_percentage INTEGER DEFAULT 0,
    related_files UUID[] DEFAULT '{}', -- Array of file IDs
    related_notes UUID[] DEFAULT '{}', -- Array of note IDs
    milestones JSONB DEFAULT '[]', -- Array of milestone objects
    ai_recommendations JSONB DEFAULT '{}', -- AI-generated study recommendations
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    CONSTRAINT study_goals_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create note enhancements table for AI-generated content improvements
CREATE TABLE public.note_enhancements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID NOT NULL,
    user_id UUID NOT NULL,
    enhancement_type VARCHAR(50) NOT NULL, -- 'summary', 'key_points', 'questions', 'flashcards', 'outline'
    original_content TEXT NOT NULL,
    enhanced_content JSONB NOT NULL, -- Store enhanced content structure
    ai_service VARCHAR(50) NOT NULL,
    model_used VARCHAR(100) NOT NULL,
    confidence_score FLOAT DEFAULT 0.8,
    is_applied BOOLEAN DEFAULT false, -- Whether user applied the enhancement
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT note_enhancements_note_id_fkey 
        FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE,
    CONSTRAINT note_enhancements_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on all new tables
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_enhancements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quiz_sessions
CREATE POLICY "Users can manage their own quiz sessions" ON public.quiz_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for learning_analytics
CREATE POLICY "Users can view their own learning analytics" ON public.learning_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert learning analytics" ON public.learning_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for content_relationships
CREATE POLICY "Users can manage their own content relationships" ON public.content_relationships
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for study_goals
CREATE POLICY "Users can manage their own study goals" ON public.study_goals
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for note_enhancements
CREATE POLICY "Users can manage their own note enhancements" ON public.note_enhancements
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_quiz_sessions_user_type ON public.quiz_sessions(user_id, quiz_type);
CREATE INDEX idx_quiz_sessions_completed ON public.quiz_sessions(user_id, completed, created_at);
CREATE INDEX idx_learning_analytics_user_date ON public.learning_analytics(user_id, date);
CREATE INDEX idx_learning_analytics_activity ON public.learning_analytics(user_id, activity_type, created_at);
CREATE INDEX idx_content_relationships_source ON public.content_relationships(user_id, source_type, source_id);
CREATE INDEX idx_content_relationships_related ON public.content_relationships(user_id, related_type, related_id);
CREATE INDEX idx_study_goals_user_status ON public.study_goals(user_id, status);
CREATE INDEX idx_note_enhancements_note_type ON public.note_enhancements(note_id, enhancement_type);

-- Create updated_at triggers
CREATE TRIGGER update_study_goals_updated_at
    BEFORE UPDATE ON public.study_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to track learning activity
CREATE OR REPLACE FUNCTION public.track_learning_activity(
    _user_id UUID,
    _activity_type VARCHAR(50),
    _activity_data JSONB,
    _performance_score FLOAT DEFAULT NULL,
    _time_spent_minutes INTEGER DEFAULT 0,
    _knowledge_areas TEXT[] DEFAULT '{}',
    _difficulty_level INTEGER DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _activity_id UUID;
BEGIN
    INSERT INTO public.learning_analytics (
        user_id,
        activity_type,
        activity_data,
        performance_score,
        time_spent_minutes,
        knowledge_areas,
        difficulty_level
    ) VALUES (
        _user_id,
        _activity_type,
        _activity_data,
        _performance_score,
        _time_spent_minutes,
        _knowledge_areas,
        _difficulty_level
    ) RETURNING id INTO _activity_id;
    
    RETURN _activity_id;
END;
$$;