-- ==============================================================================
-- ADD WATCH LEADER COLUMN ALteration
-- RUN THIS IN SUPABASE SQL EDITOR TO FIX THE TOGGLE BUG
-- ==============================================================================

-- 1. Add the is_watch_leader boolean column to vessel_members, defaulting to false
ALTER TABLE public.vessel_members 
ADD COLUMN IF NOT EXISTS is_watch_leader BOOLEAN DEFAULT false;

-- 2. Force PostgREST schema cache reload so the API accepts the payload
NOTIFY pgrst, 'reload schema';
