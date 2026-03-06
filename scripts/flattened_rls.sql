-- ==============================================================================
-- YACHTWATCH BULLETPROOF VISIBILITY SCRIPT v4 (THE DATABASE FUNCTION WAY)
-- RUN THIS IN SUPABASE SQL EDITOR TO FIX THE INFINITE RECURSION FOREVER
-- ==============================================================================

-- Clean up any existing broken policies to avoid conflicts
DROP POLICY IF EXISTS "Captains can manage their own vessels" ON public.vessels;
DROP POLICY IF EXISTS "Anyone can lookup vessels" ON public.vessels;
DROP POLICY IF EXISTS "Users can create their own join requests" ON public.join_requests;
DROP POLICY IF EXISTS "Users can view their own join requests" ON public.join_requests;
DROP POLICY IF EXISTS "Captains can view join requests for their vessels" ON public.join_requests;
DROP POLICY IF EXISTS "Captains can update join requests for their vessels" ON public.join_requests;
DROP POLICY IF EXISTS "Users can view members of their vessels" ON public.vessel_members;
DROP POLICY IF EXISTS "Captains can manage vessel crew" ON public.vessel_members;
DROP POLICY IF EXISTS "Users can view profiles of their crewmates" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Captains can manage schedules" ON public.schedules;
DROP POLICY IF EXISTS "Crew can view schedules" ON public.schedules;
DROP POLICY IF EXISTS "Crew can update schedules" ON public.schedules;

-- ==========================================
-- 🛠️ HELPER FUNCTIONS (BYPASSING RLS ISSUES)
-- ==========================================
-- Creating a Postgres function that runs with `SECURITY DEFINER` bypasses RLS
-- specifically for this lookup, preventing infinite recursion altogether!

CREATE OR REPLACE FUNCTION auth_is_captain_of(vid UUID) 
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vessels WHERE id = vid AND captain_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_is_crew_of(vid UUID) 
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vessel_members WHERE vessel_id = vid AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;


-- ==========================================
-- 🛥️ VESSELS POLICIES
-- ==========================================
CREATE POLICY "Captains can manage their own vessels" 
ON public.vessels FOR ALL TO authenticated 
USING (captain_id = auth.uid());

CREATE POLICY "Anyone can lookup vessels" 
ON public.vessels FOR SELECT TO authenticated 
USING (true);


-- ==========================================
-- 👥 VESSEL MEMBERS POLICIES 
-- ==========================================
CREATE POLICY "Users can view members of their vessels" 
ON public.vessel_members FOR SELECT TO authenticated 
USING (
  user_id = auth.uid() 
  OR auth_is_captain_of(vessel_id)
  OR auth_is_crew_of(vessel_id)
);

CREATE POLICY "Captains can manage vessel crew"
ON public.vessel_members FOR ALL TO authenticated
USING (auth_is_captain_of(vessel_id))
WITH CHECK (auth_is_captain_of(vessel_id));

-- Allow initial join (the UI might insert this after approval or during vessel creation)
CREATE POLICY "Users can insert their own vessel member row"
ON public.vessel_members FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());


-- ==========================================
-- 👤 PROFILES POLICIES
-- ==========================================
CREATE POLICY "Users can update own profile"
ON public.profiles FOR ALL TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Users can view profiles of their crewmates" 
ON public.profiles FOR SELECT TO authenticated 
USING (
  id = auth.uid() 
  OR EXISTS (
    -- Shared vessel check using the base table directly without triggering the policy again
    SELECT 1 FROM public.vessel_members vm1
    JOIN public.vessel_members vm2 ON vm1.vessel_id = vm2.vessel_id
    WHERE vm1.user_id = auth.uid() AND vm2.user_id = public.profiles.id
  )
  OR EXISTS (
    -- Captain looking at crew profile check
    SELECT 1 FROM public.vessels v
    JOIN public.vessel_members vm ON v.id = vm.vessel_id
    WHERE v.captain_id = auth.uid() AND vm.user_id = public.profiles.id
  )
);


-- ==========================================
-- 📝 JOIN REQUESTS POLICIES
-- ==========================================
CREATE POLICY "Users can create their own join requests" 
ON public.join_requests FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own join requests" 
ON public.join_requests FOR SELECT TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Captains can view join requests for their vessels" 
ON public.join_requests FOR SELECT TO authenticated 
USING (auth_is_captain_of(vessel_id));

CREATE POLICY "Captains can update join requests for their vessels" 
ON public.join_requests FOR UPDATE TO authenticated 
USING (auth_is_captain_of(vessel_id))
WITH CHECK (auth_is_captain_of(vessel_id));


-- ==========================================
-- 📅 SCHEDULES POLICIES
-- ==========================================
CREATE POLICY "Captains can manage schedules" 
ON public.schedules FOR ALL TO authenticated 
USING (auth_is_captain_of(vessel_id));

CREATE POLICY "Crew can view schedules" 
ON public.schedules FOR SELECT TO authenticated 
USING (auth_is_crew_of(vessel_id));

CREATE POLICY "Crew can update schedules" 
ON public.schedules FOR UPDATE TO authenticated 
USING (auth_is_crew_of(vessel_id))
WITH CHECK (auth_is_crew_of(vessel_id));
