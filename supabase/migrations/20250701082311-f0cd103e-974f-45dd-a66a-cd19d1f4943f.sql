
-- First, let's check if we have users without profiles and create them
-- This will handle the immediate issue of missing profiles
INSERT INTO public.profiles (id, full_name, username)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data ->> 'full_name', '') as full_name,
  COALESCE(au.raw_user_meta_data ->> 'username', au.email) as username
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Use INSERT ... ON CONFLICT to prevent duplicate key errors
  INSERT INTO public.profiles (id, full_name, username, bio)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
    ''
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NEW.raw_user_meta_data ->> 'full_name', profiles.full_name),
    username = COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to ensure profile exists for any user
CREATE OR REPLACE FUNCTION public.ensure_user_profile(_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, bio)
  SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(au.raw_user_meta_data ->> 'username', au.email),
    ''
  FROM auth.users au
  WHERE au.id = _user_id
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
