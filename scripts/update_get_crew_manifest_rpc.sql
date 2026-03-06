-- ==============================================================================
-- UPDATE RPC FOR SPLIT NAME MIGRATION
-- RUN THIS IN SUPABASE SQL EDITOR AFTER THE MIGRATION SCRIPT
-- ==============================================================================

-- Drop the old function if the return signature changes significantly, 
-- or use CREATE OR REPLACE.
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
SECURITY DEFINER -- Needs to bypass RLS to read secure passports
AS $$
BEGIN
    -- Verify the caller is the Captain of this vessel
    IF NOT EXISTS (
        SELECT 1 FROM vessels 
        WHERE id = v_vessel_id AND captain_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not authorized. Only the Captain can fetch the secure manifest.';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.first_name,
        p.last_name,
        vm.role::text, -- Cast enum to text if needed
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
