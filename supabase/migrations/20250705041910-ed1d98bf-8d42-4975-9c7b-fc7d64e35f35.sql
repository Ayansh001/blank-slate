-- Comprehensive OCR Integration Fix - Phase 1: Database Schema Corrections (Fixed)

-- 1. Ensure files table has all required columns with proper constraints
DO $$ 
BEGIN
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'files' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.files ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Ensure OCR status has proper default and constraints
    ALTER TABLE public.files ALTER COLUMN ocr_status SET DEFAULT 'pending';
    
    -- Add check constraint for valid OCR statuses
    ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_ocr_status_check;
    ALTER TABLE public.files ADD CONSTRAINT files_ocr_status_check 
        CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed', 'skipped'));
END $$;

-- 2. Fix OCR jobs table constraints and relationships
ALTER TABLE public.ocr_jobs 
    DROP CONSTRAINT IF EXISTS ocr_jobs_file_id_fkey,
    DROP CONSTRAINT IF EXISTS ocr_jobs_user_id_fkey;

ALTER TABLE public.ocr_jobs 
    ADD CONSTRAINT ocr_jobs_file_id_fkey 
        FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE,
    ADD CONSTRAINT ocr_jobs_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Add comprehensive indexes for OCR performance
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_status_user 
    ON public.ocr_jobs(status, user_id) WHERE status IN ('processing', 'pending');
    
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_file_status 
    ON public.ocr_jobs(file_id, status);
    
CREATE INDEX IF NOT EXISTS idx_files_ocr_status_user 
    ON public.files(user_id, ocr_status) WHERE ocr_status IS NOT NULL;

-- 4. Create comprehensive OCR status update function with error handling
CREATE OR REPLACE FUNCTION public.update_ocr_status_comprehensive(
    _file_id UUID,
    _user_id UUID,
    _ocr_text TEXT DEFAULT NULL,
    _ocr_confidence FLOAT DEFAULT NULL,
    _ocr_language VARCHAR(10) DEFAULT 'eng',
    _ocr_status VARCHAR(20) DEFAULT 'completed'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _result JSON;
    _updated_count INTEGER;
BEGIN
    -- Validate inputs
    IF _file_id IS NULL OR _user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'File ID and User ID are required',
            'updated_count', 0
        );
    END IF;
    
    -- Update the file record
    UPDATE public.files 
    SET 
        ocr_text = COALESCE(_ocr_text, ocr_text),
        ocr_confidence = COALESCE(_ocr_confidence, ocr_confidence),
        ocr_language = COALESCE(_ocr_language, ocr_language),
        ocr_status = _ocr_status,
        updated_at = NOW()
    WHERE id = _file_id AND user_id = _user_id;
    
    GET DIAGNOSTICS _updated_count = ROW_COUNT;
    
    -- Build result
    _result := json_build_object(
        'success', _updated_count > 0,
        'updated_count', _updated_count,
        'file_id', _file_id,
        'user_id', _user_id,
        'ocr_status', _ocr_status
    );
    
    IF _updated_count = 0 THEN
        _result := _result || json_build_object(
            'error', 'No file found or permission denied'
        );
    END IF;
    
    RETURN _result;
END;
$$;

-- 5. Create function to clean up orphaned OCR jobs
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_ocr_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _deleted_count INTEGER;
BEGIN
    -- Delete OCR jobs for files that no longer exist
    DELETE FROM public.ocr_jobs 
    WHERE file_id NOT IN (SELECT id FROM public.files);
    
    GET DIAGNOSTICS _deleted_count = ROW_COUNT;
    
    -- Update stale processing jobs older than 1 hour
    UPDATE public.ocr_jobs 
    SET 
        status = 'failed',
        error_message = 'Job timed out - exceeded maximum processing time',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE 
        status = 'processing' 
        AND started_at < NOW() - INTERVAL '1 hour';
    
    RETURN _deleted_count;
END;
$$;

-- 6. Create updated_at trigger for files table
CREATE OR REPLACE FUNCTION public.update_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS update_files_updated_at_trigger ON public.files;
CREATE TRIGGER update_files_updated_at_trigger
    BEFORE UPDATE ON public.files
    FOR EACH ROW
    EXECUTE FUNCTION public.update_files_updated_at();

-- 7. Add RLS policies for better security (if not exists)
DO $$
BEGIN
    -- Ensure users can update their own files policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'files' 
        AND policyname = 'Users can update their own files'
    ) THEN
        CREATE POLICY "Users can update their own files" ON public.files
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;