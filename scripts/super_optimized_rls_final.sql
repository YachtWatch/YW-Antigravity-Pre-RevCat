-- ==============================================================================
-- ULTIMATE YACHTWATCH RLS PERFORMANCE & SECURITY SCRIPT
-- ==============================================================================
-- This script permanently resolves both:
-- 1. "Auth RLS Initialization Plan" (by rigorously wrapping auth.uid() in scalar subqueries)
-- 2. "Multiple Permissive Policies" (by ensuring EXACTLY ONE policy per action per table)
--
-- It does this by dynamically dropping EVERY existing policy on your core tables,
-- regardless of what it was named before, and rebuilding them from scratch.
-- ==============================================================================

-- 1. WIPE ALL EXISTING POLICIES ON CORE TABLES
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('profiles', 'vessels', 'vessel_members', 'join_requests', 'schedules', 'crew_secure_data')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END;
$$;


-- 2. RECREATE SECURE HELPER FUNCTIONS WITH SEARCH PATH
CREATE OR REPLACE FUNCTION public.auth_is_captain_of(vid UUID) 
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vessels WHERE id = vid AND captain_id = (SELECT auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.auth_is_crew_of(vid UUID) 
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vessel_members WHERE vessel_id = vid AND user_id = (SELECT auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;


-- 3. SINGLE POLICY PER ACTION PER TABLE

-- ---------------------------------------------------------
-- 🛥️ VESSELS
-- ---------------------------------------------------------
CREATE POLICY "vessels_select_policy" ON public.vessels FOR SELECT TO authenticated USING (true);
CREATE POLICY "vessels_insert_policy" ON public.vessels FOR INSERT TO authenticated WITH CHECK (captain_id = (SELECT auth.uid()));
CREATE POLICY "vessels_update_policy" ON public.vessels FOR UPDATE TO authenticated USING (captain_id = (SELECT auth.uid())) WITH CHECK (captain_id = (SELECT auth.uid()));
CREATE POLICY "vessels_delete_policy" ON public.vessels FOR DELETE TO authenticated USING (captain_id = (SELECT auth.uid()));

-- ---------------------------------------------------------
-- 👥 VESSEL MEMBERS 
-- ---------------------------------------------------------
CREATE POLICY "vessel_members_select_policy" ON public.vessel_members FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid()) 
  OR public.auth_is_captain_of(vessel_id)
  OR public.auth_is_crew_of(vessel_id)
);
CREATE POLICY "vessel_members_insert_policy" ON public.vessel_members FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR public.auth_is_captain_of(vessel_id)
);
CREATE POLICY "vessel_members_update_policy" ON public.vessel_members FOR UPDATE TO authenticated
USING (public.auth_is_captain_of(vessel_id))
WITH CHECK (public.auth_is_captain_of(vessel_id));
CREATE POLICY "vessel_members_delete_policy" ON public.vessel_members FOR DELETE TO authenticated
USING (
  user_id = (SELECT auth.uid()) 
  OR public.auth_is_captain_of(vessel_id)
);

-- ---------------------------------------------------------
-- 👤 PROFILES
-- ---------------------------------------------------------
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT TO authenticated
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
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid())) 
WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY "profiles_delete_policy" ON public.profiles FOR DELETE TO authenticated
USING (id = (SELECT auth.uid()));

-- ---------------------------------------------------------
-- 📝 JOIN REQUESTS
-- ---------------------------------------------------------
CREATE POLICY "join_requests_select_policy" ON public.join_requests FOR SELECT TO authenticated 
USING (user_id = (SELECT auth.uid()) OR public.auth_is_captain_of(vessel_id));
CREATE POLICY "join_requests_insert_policy" ON public.join_requests FOR INSERT TO authenticated 
WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "join_requests_update_policy" ON public.join_requests FOR UPDATE TO authenticated 
USING (public.auth_is_captain_of(vessel_id))
WITH CHECK (public.auth_is_captain_of(vessel_id));
CREATE POLICY "join_requests_delete_policy" ON public.join_requests FOR DELETE TO authenticated 
USING (user_id = (SELECT auth.uid()) OR public.auth_is_captain_of(vessel_id));

-- ---------------------------------------------------------
-- 📅 SCHEDULES
-- ---------------------------------------------------------
CREATE POLICY "schedules_select_policy" ON public.schedules FOR SELECT TO authenticated 
USING (public.auth_is_captain_of(vessel_id) OR public.auth_is_crew_of(vessel_id));
CREATE POLICY "schedules_insert_policy" ON public.schedules FOR INSERT TO authenticated 
WITH CHECK (public.auth_is_captain_of(vessel_id));
CREATE POLICY "schedules_update_policy" ON public.schedules FOR UPDATE TO authenticated 
USING (public.auth_is_captain_of(vessel_id) OR public.auth_is_crew_of(vessel_id))
WITH CHECK (public.auth_is_captain_of(vessel_id) OR public.auth_is_crew_of(vessel_id));
CREATE POLICY "schedules_delete_policy" ON public.schedules FOR DELETE TO authenticated 
USING (public.auth_is_captain_of(vessel_id));

-- ---------------------------------------------------------
-- 🔑 CREW SECURE DATA (VAULT)
-- ---------------------------------------------------------
CREATE POLICY "crew_secure_data_select_policy" ON public.crew_secure_data FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY "crew_secure_data_insert_policy" ON public.crew_secure_data FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "crew_secure_data_update_policy" ON public.crew_secure_data FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "crew_secure_data_delete_policy" ON public.crew_secure_data FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));
