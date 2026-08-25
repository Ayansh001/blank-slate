
-- Phase 1: Database Schema Corrections

-- 1. Add missing UPDATE policy for files table to allow OCR results to be saved
CREATE POLICY "Users can update their own files" ON public.files
  FOR UPDATE USING (auth.uid() = user_id);

-- 2. Fix foreign key references - Update OCR jobs to properly reference files and users
-- First, let's ensure the foreign key constraints are properly set up
ALTER TABLE public.ocr_jobs 
  DROP CONSTRAINT IF EXISTS ocr_jobs_file_id_fkey,
  DROP CONSTRAINT IF EXISTS ocr_jobs_user_id_fkey;

ALTER TABLE public.ocr_jobs 
  ADD CONSTRAINT ocr_jobs_file_id_fkey 
    FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE,
  ADD CONSTRAINT ocr_jobs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Optimize indexes for better OCR performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ocr_jobs_file_user 
  ON public.ocr_jobs(file_id, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_ocr_user 
  ON public.files(user_id, ocr_status) WHERE ocr_status IS NOT NULL;

-- 4. Add a function to safely update OCR status with proper error handling
CREATE OR REPLACE FUNCTION public.update_ocr_status(
  _file_id UUID,
  _user_id UUID,
  _ocr_text TEXT DEFAULT NULL,
  _ocr_confidence FLOAT DEFAULT NULL,
  _ocr_language VARCHAR(10) DEFAULT 'eng',
  _ocr_status VARCHAR(20) DEFAULT 'completed'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.files 
  SET 
    ocr_text = COALESCE(_ocr_text, ocr_text),
    ocr_confidence = COALESCE(_ocr_confidence, ocr_confidence),
    ocr_language = COALESCE(_ocr_language, ocr_language),
    ocr_status = _ocr_status,
    updated_at = NOW()
  WHERE id = _file_id AND user_id = _user_id;
  
  RETURN FOUND;
END;
$$;
