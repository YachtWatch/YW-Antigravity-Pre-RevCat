-- ==============================================================================
-- FIX SUPABASE SECURITY WARNINGS: "Function Search Path Mutable"
-- ==============================================================================
-- The Supabase Security Advisor flags functions that do not explicitly set a 
-- search_path. Without an explicit search path, functions can be vulnerable to 
-- search path injection attacks if they run with SECURITY DEFINER privileges.
--
-- This script uses a dynamic DO block to automatically find the exact signatures
-- for the flagged functions and applies the secure "SET search_path = public" 
-- configuration to them without altering their logic.
-- ==============================================================================

DO $$
DECLARE
    rec record;
BEGIN
    FOR rec IN 
        SELECT 
            n.nspname AS schema_name,
            p.proname AS function_name,
            pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND p.proname IN (
              'remove_crew_member_v2', 
              'remove_crew_member', 
              'auth_is_captain_of', 
              'handle_new_user', 
              'auth_is_crew_of'
          )
    LOOP
        -- Execute the ALTER FUNCTION command dynamically for each matching function
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', 
            rec.schema_name, rec.function_name, rec.args);
            
        RAISE NOTICE 'Secured function: %.%(%)', rec.schema_name, rec.function_name, rec.args;
    END LOOP;
END;
$$;
