import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

// We need a user to test as. Let's just create a client and see what happens.
const supabase = createClient(supabaseUrl, serviceKey);

async function test() {
    const { data: v } = await supabase.from('vessels').select('*').limit(1);
    console.log("Vessels:", v);
    if (!v || v.length === 0) return;

    // Auth as captain
    const captainId = v[0].captain_id;
    console.log("Captain ID:", captainId);

    // Call RPC using service role won't have auth.uid() properly unless we simulate it or login
    // Let's just create a real user session if possible, or we can just see if the RPC exists.
    const { data: m, error: e } = await supabase.rpc('get_crew_manifest', { v_vessel_id: v[0].id });
    console.log("RPC Error (Service Role):", e);
    console.log("RPC Data (Service Role):", m);
}

test();
