-- ==============================================================================
-- FIX SUPABASE PERFORMANCE WARNINGS: "Auth RLS Initialization Plan"
-- ==============================================================================
-- Supabase Performance Advisor flags policies that call `auth.uid()` directly.
-- Because `auth.uid()` is evaluated by PostgreSQL as a stable function, doing 
-- `column = auth.uid()` can cause Postgres to re-evaluate it per-row, leading 
-- to slow queries (Sequential Scans) on large tables.
--
-- THE FIX: Wrapping it in a scalar subquery `(SELECT auth.uid())` forces the 
-- Postgres query planner to evaluate it exactly ONCE for the entire query, 
-- allowing it to use indexes correctly!
-- ==============================================================================

-- 1. DROP EXISTING POLICIES TO AVOID CONFLICTS
DROP POLICY IF EXISTS "Captains can manage their own vessels" ON public.vessels;
DROP POLICY IF EXISTS "Anyone can lookup vessels" ON public.vessels;

DROP POLICY IF EXISTS "Users can view members of their vessels" ON public.vessel_members;
DROP POLICY IF EXISTS "Captains can manage vessel crew" ON public.vessel_members;
DROP POLICY IF EXISTS "Users can insert their own vessel member row" ON public.vessel_members;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of their crewmates" ON public.profiles;

DROP POLICY IF EXISTS "Users can create their own join requests" ON public.join_requests;
DROP POLICY IF EXISTS "Users can view their own join requests" ON public.join_requests;
DROP POLICY IF EXISTS "Captains can view join requests for their vessels" ON public.join_requests;
DROP POLICY IF EXISTS "Captains can update join requests for their vessels" ON public.join_requests;

DROP POLICY IF EXISTS "Captains can manage schedules" ON public.schedules;
DROP POLICY IF EXISTS "Crew can view schedules" ON public.schedules;
DROP POLICY IF EXISTS "Crew can update schedules" ON public.schedules;

DROP POLICY IF EXISTS "Users can insert their own secure data" ON public.crew_secure_data;
DROP POLICY IF EXISTS "Users can update their own secure data" ON public.crew_secure_data;
DROP POLICY IF EXISTS "Users can read their own secure data" ON public.crew_secure_data;


-- 2. RECREATE HELPER FUNCTIONS (WITH SCALAR SUBQUERY AND SEARCH_PATH)
CREATE OR REPLACE FUNCTION auth_is_captain_of(vid UUID) 
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vessels WHERE id = vid AND captain_id = (SELECT auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION auth_is_crew_of(vid UUID) 
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vessel_members WHERE vessel_id = vid AND user_id = (SELECT auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;


-- 3. RECREATE POLICIES (WRAPPING AUTH.UID)

-- 🛥️ VESSELS
CREATE POLICY "Captains can manage their own vessels" 
ON public.vessels FOR ALL TO authenticated 
USING (captain_id = (SELECT auth.uid()));

CREATE POLICY "Anyone can lookup vessels" 
ON public.vessels FOR SELECT TO authenticated 
USING (true);


-- 👥 VESSEL MEMBERS 
CREATE POLICY "Users can view members of their vessels" 
ON public.vessel_members FOR SELECT TO authenticated 
USING (
  user_id = (SELECT auth.uid()) 
  OR auth_is_captain_of(vessel_id)
  OR auth_is_crew_of(vessel_id)
);

CREATE POLICY "Captains can manage vessel crew"
ON public.vessel_members FOR ALL TO authenticated
USING (auth_is_captain_of(vessel_id))
WITH CHECK (auth_is_captain_of(vessel_id));

CREATE POLICY "Users can insert their own vessel member row"
ON public.vessel_members FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));


-- 👤 PROFILES
CREATE POLICY "Users can update own profile"
ON public.profiles FOR ALL TO authenticated
USING (id = (SELECT auth.uid())) 
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Users can view profiles of their crewmates" 
ON public.profiles FOR SELECT TO authenticated 
USING (
  id = (SELECT auth.uid()) 
  OR EXISTS (
    SELECT 1 FROM public.vessel_members vm1
    JOIN public.vessel_members vm2 ON vm1.vessel_id = vm2.vessel_id
    WHERE vm1.user_id = (SELECT auth.uid()) AND vm2.user_id = public.profiles.id
  )
  OR EXISTS (
    SELECT 1 FROM public.vessels v
    JOIN public.vessel_members vm ON v.id = vm.vessel_id
    WHERE v.captain_id = (SELECT auth.uid()) AND vm.user_id = public.profiles.id
  )
);


-- 📝 JOIN REQUESTS
CREATE POLICY "Users can create their own join requests" 
ON public.join_requests FOR INSERT TO authenticated 
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can view their own join requests" 
ON public.join_requests FOR SELECT TO authenticated 
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Captains can view join requests for their vessels" 
ON public.join_requests FOR SELECT TO authenticated 
USING (auth_is_captain_of(vessel_id));

CREATE POLICY "Captains can update join requests for their vessels" 
ON public.join_requests FOR UPDATE TO authenticated 
USING (auth_is_captain_of(vessel_id))
WITH CHECK (auth_is_captain_of(vessel_id));


-- 📅 SCHEDULES
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


-- 🔑 CREW SECURE DATA (PASSPORT VAULT)
CREATE POLICY "Users can insert their own secure data"
ON public.crew_secure_data FOR INSERT
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own secure data"
ON public.crew_secure_data FOR UPDATE
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can read their own secure data"
ON public.crew_secure_data FOR SELECT
USING ((SELECT auth.uid()) = user_id);
