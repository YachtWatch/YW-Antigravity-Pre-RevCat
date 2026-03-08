import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
async function run() {
    console.log("Fetching profiles...");
    const { data: profiles } = await supabase.from('profiles').select('*').limit(5);
    console.log(JSON.stringify(profiles, null, 2));
    
    console.log("\nFetching schedules...");
    const { data: schedules } = await supabase.from('schedules').select('*').limit(2);
    console.log(JSON.stringify(schedules, null, 2));
}
run();
