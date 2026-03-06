-- ==============================================================================
-- SPLIT NAME MIGRATION SCRIPT
-- RUN THIS IN SUPABASE SQL EDITOR
-- ==============================================================================

-- 1. Add new columns to 'profiles' table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- 2. Add new columns to 'join_requests' table payload
ALTER TABLE public.join_requests 
ADD COLUMN IF NOT EXISTS user_first_name text,
ADD COLUMN IF NOT EXISTS user_last_name text;

-- 3. Migrate existing data in 'profiles'
UPDATE public.profiles
SET 
  first_name = split_part(name, ' ', 1),
  last_name = CASE 
                WHEN POSITION(' ' IN name) > 0 THEN substring(name from POSITION(' ' IN name) + 1)
                ELSE ''
              END
WHERE first_name IS NULL AND name IS NOT NULL;

-- 4. Migrate existing data in 'join_requests'
UPDATE public.join_requests
SET 
  user_first_name = split_part(user_name, ' ', 1),
  user_last_name = CASE 
                WHEN POSITION(' ' IN user_name) > 0 THEN substring(user_name from POSITION(' ' IN user_name) + 1)
                ELSE ''
              END
WHERE user_first_name IS NULL AND user_name IS NOT NULL;

-- 5. Force PostgREST schema cache reload so the API accepts the payload
NOTIFY pgrst, 'reload schema';
