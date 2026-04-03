-- Create concept learning sessions table
CREATE TABLE IF NOT EXISTS concept_learning_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'intermediate',
  mode TEXT NOT NULL DEFAULT 'basic',
  response_data JSONB,
  tokens_used INTEGER DEFAULT 0,
  processing_time INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE concept_learning_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view their own concept learning sessions"
  ON concept_learning_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can insert their own concept learning sessions"
  ON concept_learning_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_concept_learning_sessions_user_id ON concept_learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_concept_learning_sessions_created_at ON concept_learning_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_concept_learning_sessions_concept ON concept_learning_sessions(concept);