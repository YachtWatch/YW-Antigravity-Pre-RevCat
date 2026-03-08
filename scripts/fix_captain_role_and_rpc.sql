-- ==============================================================================
-- FIX: Captain role in vessel_members + Updated get_crew_manifest RPC
-- Run this in Supabase SQL Editor
-- ==============================================================================

-- 1. Fix existing captain rows in vessel_members that have no role set
UPDATE public.vessel_members vm
SET role = 'captain'
FROM public.vessels v
WHERE vm.vessel_id = v.id
  AND vm.user_id = v.captain_id
  AND (vm.role IS NULL OR vm.role != 'captain');

-- 2. Update get_crew_manifest to handle null/missing captain role gracefully
DROP FUNCTION IF EXISTS public.get_crew_manifest(uuid);

CREATE OR REPLACE FUNCTION public.get_crew_manifest(v_vessel_id uuid)
RETURNS TABLE (
    user_id uuid,
    first_name text,
    last_name text,
    role text,
    custom_role text,
    nationality text,
    passport_number text,
    date_of_birth date
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_captain_id uuid;
BEGIN
    -- Verify the caller is the Captain of this vessel
    SELECT captain_id INTO v_captain_id FROM vessels WHERE id = v_vessel_id;
    
    IF v_captain_id IS NULL OR v_captain_id != auth.uid() THEN
        RAISE EXCEPTION 'Not authorized. Only the Captain can fetch the secure manifest.';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        COALESCE(p.first_name, split_part(p.name, ' ', 1), 'Unknown') as first_name,
        COALESCE(p.last_name, substring(p.name from position(' ' in p.name) + 1), 'Crew') as last_name,
        -- If role is null (legacy captain rows), use 'captain' for the captain and 'crew' for everyone else
        COALESCE(vm.role::text, CASE WHEN p.id = v_captain_id THEN 'captain' ELSE 'crew' END) as role,
        p.custom_role,
        p.nationality,
        csd.passport_number,
        csd.date_of_birth
    FROM vessel_members vm
    JOIN profiles p ON vm.user_id = p.id
    LEFT JOIN crew_secure_data csd ON vm.user_id = csd.user_id
    WHERE vm.vessel_id = v_vessel_id;
END;
$$;
