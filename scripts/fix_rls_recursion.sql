-- ==============================================================================
-- FIX RLS INFINITE RECURSION BUG
-- ==============================================================================
-- The previous RLS policy for `profiles` joined `vessel_members` to check if you 
-- shared a vessel. However, `vessel_members` policy checked `auth_is_crew_of`, 
-- which queried `vessel_members`. When the frontend performed a join: 
-- `vessel_members -> profiles!inner(...)`, Postgres hit an infinite recursion loop 
-- and returned 0 rows to protect itself.
--
-- THE FIX: Since all highly sensitive data (passports, DOBs) has been safely 
-- moved to the locked `crew_secure_data` table, the `profiles` table only contains 
-- basic identifiers (Name, Role). We can safely allow authenticated users to SELECT 
-- from profiles, letting the `vessel_members` policy do the actual security filtering 
-- of "who is on my boat".
-- ==============================================================================

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- Open basic read access to profiles for authenticated users.
-- The secure data is still locked in crew_secure_data.
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT TO authenticated USING (true);
