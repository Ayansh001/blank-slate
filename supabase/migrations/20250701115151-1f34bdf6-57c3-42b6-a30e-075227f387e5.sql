
-- Create folders table for directory structure
CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on folders table
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for folders
CREATE POLICY "Users can view their own folders" 
  ON public.folders 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders" 
  ON public.folders 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" 
  ON public.folders 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" 
  ON public.folders 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add new columns to files table for enhanced functionality
ALTER TABLE public.files ADD COLUMN folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL;
ALTER TABLE public.files ADD COLUMN tags TEXT[] DEFAULT '{}';
ALTER TABLE public.files ADD COLUMN thumbnail_path TEXT;
ALTER TABLE public.files ADD COLUMN metadata JSONB DEFAULT '{}';
ALTER TABLE public.files ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE public.files ADD COLUMN checksum TEXT;

-- Create indexes for better performance
CREATE INDEX idx_files_folder_id ON public.files(folder_id);
CREATE INDEX idx_files_tags ON public.files USING GIN(tags);
CREATE INDEX idx_files_user_folder ON public.files(user_id, folder_id);
CREATE INDEX idx_folders_parent ON public.folders(parent_id);
CREATE INDEX idx_folders_user ON public.folders(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for folders updated_at
CREATE TRIGGER update_folders_updated_at 
  BEFORE UPDATE ON public.folders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
