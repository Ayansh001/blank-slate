
-- Add OCR-related columns to files table
ALTER TABLE public.files 
ADD COLUMN ocr_text TEXT DEFAULT NULL,
ADD COLUMN ocr_confidence FLOAT DEFAULT NULL,
ADD COLUMN ocr_language VARCHAR(10) DEFAULT 'eng',
ADD COLUMN ocr_status VARCHAR(20) DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed', 'skipped'));

-- Create OCR jobs table for queue management
CREATE TABLE public.ocr_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES public.files(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  language VARCHAR(10) DEFAULT 'eng',
  preprocessing_options JSONB DEFAULT '{}',
  error_message TEXT DEFAULT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for OCR jobs
ALTER TABLE public.ocr_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for OCR jobs
CREATE POLICY "Users can view their own OCR jobs" ON public.ocr_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own OCR jobs" ON public.ocr_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own OCR jobs" ON public.ocr_jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own OCR jobs" ON public.ocr_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_files_ocr_status ON public.files(ocr_status);
CREATE INDEX idx_files_ocr_text ON public.files USING gin(to_tsvector('english', ocr_text));
CREATE INDEX idx_ocr_jobs_status ON public.ocr_jobs(status);
CREATE INDEX idx_ocr_jobs_user_id ON public.ocr_jobs(user_id);

-- Create trigger for updated_at timestamp on OCR jobs
CREATE TRIGGER update_ocr_jobs_updated_at
  BEFORE UPDATE ON public.ocr_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
