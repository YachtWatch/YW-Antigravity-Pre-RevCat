-- ==============================================================================
-- FIX MISSING PROFILES INSERT POLICY
-- ==============================================================================
-- During the recent aggressive RLS optimization, the INSERT policy for 
-- public.profiles was accidentally omitted. This prevented new (or re-authenticating) 
-- users from automatically upserting their profile data via AuthContext, 
-- causing the frontend to fall back to the "Pending Setup" placeholder name.
-- ==============================================================================

-- Drop if it already exists (unlikely, but safe)
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

-- Create the missing INSERT policy
-- Users can only insert a profile row that matches their own auth.uid()
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = (SELECT auth.uid()));
