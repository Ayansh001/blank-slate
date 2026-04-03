-- Create concept_learning_sessions table for enhanced concept learner
CREATE TABLE public.concept_learning_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  concept TEXT NOT NULL,
  difficulty TEXT DEFAULT 'intermediate',
  mode TEXT DEFAULT 'basic',
  response_data JSONB NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  processing_time INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.concept_learning_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own concept learning sessions" 
ON public.concept_learning_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own concept learning sessions" 
ON public.concept_learning_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own concept learning sessions" 
ON public.concept_learning_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own concept learning sessions" 
ON public.concept_learning_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_concept_learning_sessions_updated_at
BEFORE UPDATE ON public.concept_learning_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();