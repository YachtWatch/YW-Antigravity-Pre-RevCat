import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl) {
    console.error("NO SUPABASE URL!");
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data: v } = await supabase.from('vessels').select('*').limit(1);
    if (!v || v.length === 0) { console.log("No vessels"); return; }
    
    // Auth as captain
    const captainId = v[0].captain_id;
    console.log("Captain ID:", captainId);

    const { data: m, error: e } = await supabase.rpc('get_crew_manifest', { v_vessel_id: v[0].id });
    console.log("RPC Error:", e);
    console.log("RPC Data:", m);
}

test();
