-- Add missing INSERT policy for ai_daily_quotes table to allow edge functions to create quotes
CREATE POLICY "Service role can insert daily quotes" 
ON ai_daily_quotes 
FOR INSERT 
WITH CHECK (true);

-- Add function to safely insert quotes with proper error handling
CREATE OR REPLACE FUNCTION insert_daily_quote(
  _user_id uuid,
  _quote_text text,
  _category text,
  _ai_service text,
  _model_used text,
  _generated_date date DEFAULT CURRENT_DATE
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _result json;
  _quote_id uuid;
BEGIN
  -- Insert the quote
  INSERT INTO ai_daily_quotes (
    user_id,
    quote_text,
    category,
    ai_service,
    model_used,
    generated_date
  ) VALUES (
    _user_id,
    _quote_text,
    _category,
    _ai_service,
    _model_used,
    _generated_date
  ) RETURNING id INTO _quote_id;
  
  _result := json_build_object(
    'success', true,
    'quote_id', _quote_id,
    'user_id', _user_id,
    'message', 'Quote inserted successfully'
  );
  
  RETURN _result;
  
EXCEPTION 
  WHEN OTHERS THEN
    _result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
    RETURN _result;
END;
$$;

-- Create index for better performance on date queries
CREATE INDEX IF NOT EXISTS idx_ai_daily_quotes_user_date 
ON ai_daily_quotes(user_id, generated_date);

-- Create index for better performance on service queries
CREATE INDEX IF NOT EXISTS idx_ai_daily_quotes_service 
ON ai_daily_quotes(ai_service, generated_date);