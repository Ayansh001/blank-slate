-- Create trigger function to update total_messages in ai_chat_sessions
CREATE OR REPLACE FUNCTION update_chat_session_message_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total_messages count when a message is inserted
    IF TG_OP = 'INSERT' THEN
        UPDATE ai_chat_sessions 
        SET 
            total_messages = (
                SELECT COUNT(*) 
                FROM ai_chat_messages 
                WHERE session_id = NEW.session_id
            ),
            updated_at = NOW()
        WHERE id = NEW.session_id;
        RETURN NEW;
    END IF;
    
    -- Update total_messages count when a message is deleted
    IF TG_OP = 'DELETE' THEN
        UPDATE ai_chat_sessions 
        SET 
            total_messages = (
                SELECT COUNT(*) 
                FROM ai_chat_messages 
                WHERE session_id = OLD.session_id
            ),
            updated_at = NOW()
        WHERE id = OLD.session_id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update message counts
DROP TRIGGER IF EXISTS trigger_update_chat_message_count ON ai_chat_messages;
CREATE TRIGGER trigger_update_chat_message_count
    AFTER INSERT OR DELETE ON ai_chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_session_message_count();

-- One-time repair of existing chat sessions with incorrect message counts
UPDATE ai_chat_sessions 
SET total_messages = (
    SELECT COUNT(*) 
    FROM ai_chat_messages 
    WHERE ai_chat_messages.session_id = ai_chat_sessions.id
)
WHERE total_messages != (
    SELECT COUNT(*) 
    FROM ai_chat_messages 
    WHERE ai_chat_messages.session_id = ai_chat_sessions.id
) OR total_messages IS NULL;