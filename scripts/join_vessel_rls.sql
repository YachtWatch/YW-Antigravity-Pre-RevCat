-- Enable Row Level Security
ALTER TABLE public.vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- VESSELS POLICIES
-- Captains can manage their own vessels
CREATE POLICY "Captains can view and update their vessels" 
ON public.vessels FOR ALL 
TO authenticated 
USING (captain_id = auth.uid());

-- Allow any authenticated user to lookup vessels by join_code 
-- Since RLS policies apply per-row, the simplest way to allow the frontend query:
--   supabase.from('vessels').select('*').eq('join_code', code)
-- is to allow all authenticated users to read vessel data. 
-- (If you want to keep vessel data strictly private, you would use a Postgres Function instead)
CREATE POLICY "Anyone can lookup vessels" 
ON public.vessels FOR SELECT 
TO authenticated 
USING (true);


-- JOIN REQUESTS POLICIES
-- Allow a user to create a join request for themselves
CREATE POLICY "Users can create their own join requests" 
ON public.join_requests FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Allow users to see the status of their own join requests
CREATE POLICY "Users can view their own join requests" 
ON public.join_requests FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Allow captains to view join requests for their vessels
CREATE POLICY "Captains can view join requests for their vessels" 
ON public.join_requests FOR SELECT 
TO authenticated 
USING (
  vessel_id IN (
    SELECT id FROM public.vessels WHERE captain_id = auth.uid()
  )
);

-- Allow captains to approve/reject (update) join requests for their vessels
CREATE POLICY "Captains can update join requests for their vessels" 
ON public.join_requests FOR UPDATE 
TO authenticated 
USING (
  vessel_id IN (
    SELECT id FROM public.vessels WHERE captain_id = auth.uid()
  )
)
WITH CHECK (
  vessel_id IN (
    SELECT id FROM public.vessels WHERE captain_id = auth.uid()
  )
);
