-- Add session_id to note_enhancements for session management
ALTER TABLE public.note_enhancements 
ADD COLUMN IF NOT EXISTS session_id TEXT NULL;

-- Index for fast session fetches
CREATE INDEX IF NOT EXISTS idx_note_enhancements_session 
  ON public.note_enhancements(session_id);

-- Composite index for per-user session operations
CREATE INDEX IF NOT EXISTS idx_note_enhancements_user_session 
  ON public.note_enhancements(user_id, session_id);