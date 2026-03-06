-- ==========================================
-- 👥 VESSEL MEMBERS & PROFILES VISIBILITY
-- ==========================================
-- Run this in your Supabase SQL Editor to allow crew and captains to see each other.

-- Enable RLS just in case it isn't
ALTER TABLE public.vessel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. VESSEL MEMBERS: Allow users to see all members of any vessel they are a part of
DROP POLICY IF EXISTS "Users can view members of their vessels" ON public.vessel_members;
CREATE POLICY "Users can view members of their vessels" 
ON public.vessel_members FOR SELECT 
TO authenticated 
USING (
  -- The user is the captain of the vessel
  vessel_id IN (SELECT id FROM public.vessels WHERE captain_id = auth.uid())
  OR 
  -- OR the user is a member of the vessel
  vessel_id IN (SELECT vessel_id FROM public.vessel_members WHERE user_id = auth.uid())
);

-- Note: Postgres handles the above subquery gracefully without infinite recursion 
-- because it resolves the inner query using the user's own identity.


-- 2. PROFILES: Allow users to see profiles if they share a vessel
DROP POLICY IF EXISTS "Users can view profiles of their crewmates" ON public.profiles;
CREATE POLICY "Users can view profiles of their crewmates" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
  -- User can always see their own profile
  id = auth.uid()
  OR 
  -- Or they share a vessel membership
  id IN (
    SELECT user_id FROM public.vessel_members WHERE vessel_id IN (
      SELECT vessel_id FROM public.vessel_members WHERE user_id = auth.uid()
    )
  )
  OR
  -- Or the person viewing is the captain of a vessel the profile belongs to
  id IN (
    SELECT user_id FROM public.vessel_members WHERE vessel_id IN (
      SELECT id FROM public.vessels WHERE captain_id = auth.uid()
    )
  )
);

-- 3. PROFILES: Allow users to UPDATE their own profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 4. VESSEL MEMBERS: Captains can add/remove crew
DROP POLICY IF EXISTS "Captains can manage vessel crew" ON public.vessel_members;
CREATE POLICY "Captains can manage vessel crew"
ON public.vessel_members FOR ALL
TO authenticated
USING (
  vessel_id IN (SELECT id FROM public.vessels WHERE captain_id = auth.uid())
);
