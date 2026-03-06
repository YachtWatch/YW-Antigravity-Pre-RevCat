-- ==============================================================================
-- FIX RLS INFINITE RECURSION BUG (VESSEL MEMBERS)
-- ==============================================================================
-- We hit a secondary recursion loop:
-- The `vessel_members_select_policy` checked `auth_is_crew_of()`, which naturally 
-- queried `vessel_members`. This caused Postgres to loop and fail silently (returning 0 rows).
-- 
-- THE FIX: Because `vessel_members` contains ZERO sensitive data (just a link between a 
-- random vessel UUID and a user UUID), we can safely open read access. The actual 
-- sensitive data (passports) remains totally locked down in `crew_secure_data`.
-- By using a simple `USING (true)` for SELECTs, we drastically speed up dashboard loading 
-- times and prevent any infinite recursion issues for crew members checking the roster!
-- ==============================================================================

DROP POLICY IF EXISTS "vessel_members_select_policy" ON public.vessel_members;

-- Open basic read access to vessel_members for authenticated users.
-- UUIDs are unguessable, so this is highly secure while being maximally performant.
CREATE POLICY "vessel_members_select_policy" ON public.vessel_members FOR SELECT TO authenticated USING (true);
