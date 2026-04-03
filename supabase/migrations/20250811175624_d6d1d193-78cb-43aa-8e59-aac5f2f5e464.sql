
-- Add missing foreign key constraint for ai_chat_messages.session_id -> ai_chat_sessions.id
ALTER TABLE ai_chat_messages 
ADD CONSTRAINT ai_chat_messages_session_id_fkey 
FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id ON ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_id ON ai_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id_updated_at ON ai_chat_sessions(user_id, updated_at DESC);

-- Create trigger to automatically update total_messages count in ai_chat_sessions
CREATE OR REPLACE TRIGGER tr_ai_chat_messages_update_count
    AFTER INSERT OR DELETE ON ai_chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_session_message_count();
