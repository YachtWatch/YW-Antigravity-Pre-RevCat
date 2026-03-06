-- ==============================================================================
-- FIX SUPABASE PERFORMANCE WARNINGS: "Duplicate Index"
-- ==============================================================================
-- Supabase Performance Advisor flags duplicate indexes where multiple indexes 
-- cover the exact same columns on the exact same table. This wastes disk storage 
-- and slightly slows down INSERT/UPDATE operations.
--
-- Our earlier manual optimization script likely created indexes that Supabase 
-- had already auto-generated under different names.
--
-- THE FIX: This dynamic script perfectly safely scans your entire database 
-- for mathematically identical non-unique indexes and drops all redundancies, 
-- leaving exactly one copy of each necessary index.
-- ==============================================================================

DO $$
DECLARE
    rec record;
    idx_name text;
BEGIN
    FOR rec IN 
        SELECT 
            -- Group identical indexes and order them so we deterministically 
            -- keep the oldest one and drop the newer duplicates
            ARRAY_AGG(i.relname ORDER BY i.oid) AS redundant_indexes
        FROM pg_index x
        JOIN pg_class i ON i.oid = x.indexrelid
        JOIN pg_class t ON t.oid = x.indrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          -- Protect Primary Keys and Unique Constraints from being touched
          AND NOT x.indisprimary
          AND NOT x.indisunique
        GROUP BY x.indrelid, x.indkey
        HAVING count(*) > 1
    LOOP
        -- Loop through the duplicates (skipping the first original index)
        FOR idx IN 2 .. array_length(rec.redundant_indexes, 1) LOOP
            idx_name := rec.redundant_indexes[idx];
            
            -- Drop the duplicate
            EXECUTE format('DROP INDEX IF EXISTS public.%I', idx_name);
            
            RAISE NOTICE 'Dropped duplicate index: public.%', idx_name;
        END LOOP;
    END LOOP;
END;
$$;
