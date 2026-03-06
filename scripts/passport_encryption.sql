-- ==============================================================================
-- PASSPORT & SENSITIVE DATA VAULT MIGRATION
-- Run this script in the Supabase SQL Editor.
-- ==============================================================================

-- 1. Create the secure table for sensitive crew data
CREATE TABLE IF NOT EXISTS public.crew_secure_data (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    passport_number TEXT,
    date_of_birth DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.crew_secure_data ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Users can only insert/update/read their OWN secure data
CREATE POLICY "Users can insert their own secure data" 
    ON public.crew_secure_data FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own secure data" 
    ON public.crew_secure_data FOR UPDATE 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own secure data" 
    ON public.crew_secure_data FOR SELECT 
    USING (auth.uid() = user_id);

-- 4. Migrate existing sensitive data from `profiles` to `crew_secure_data`
-- (Assuming date_of_birth and nationality/passport might have been in profiles
-- but actually let's migrate any existing passport_number/date_of_birth columns from profiles if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='passport_number') THEN
        INSERT INTO public.crew_secure_data (user_id, passport_number, date_of_birth)
        SELECT id, passport_number, date_of_birth FROM public.profiles
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END $$;

-- 5. Drop sensitive columns from public profiles to ensure they cannot be leaked anymore
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='passport_number') THEN
        ALTER TABLE public.profiles DROP COLUMN passport_number;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='date_of_birth') THEN
        ALTER TABLE public.profiles DROP COLUMN date_of_birth;
    END IF;
END $$;

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_crew_secure_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_crew_secure_data_updated_at ON public.crew_secure_data;
CREATE TRIGGER trg_crew_secure_data_updated_at
    BEFORE UPDATE ON public.crew_secure_data
    FOR EACH ROW
    EXECUTE FUNCTION update_crew_secure_data_updated_at();

-- 7. Ensure schema cache is updated for PostgREST
NOTIFY pgrst, 'reload schema';

-- 8. Create RPC for Captains to securely fetch the manifest
DROP FUNCTION IF EXISTS public.get_crew_passports(uuid);
CREATE OR REPLACE FUNCTION public.get_crew_passports(v_vessel_id uuid)
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
        vm.role::text,
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
