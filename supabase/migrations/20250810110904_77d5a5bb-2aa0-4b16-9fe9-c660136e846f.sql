
-- Update note_enhancements table to support file enhancements
-- Make note_id nullable and add file_id column
ALTER TABLE public.note_enhancements 
ALTER COLUMN note_id DROP NOT NULL;

-- Add file_id column with foreign key reference
ALTER TABLE public.note_enhancements 
ADD COLUMN file_id UUID REFERENCES public.files(id) ON DELETE CASCADE;

-- Add constraint to ensure either note_id OR file_id is provided (not both, not neither)
ALTER TABLE public.note_enhancements 
ADD CONSTRAINT note_enhancements_source_check 
CHECK (
  (note_id IS NOT NULL AND file_id IS NULL) OR 
  (note_id IS NULL AND file_id IS NOT NULL)
);

-- Update existing records to ensure they comply with the new constraint
-- (This assumes all existing records have note_id and we're just adding the constraint)
