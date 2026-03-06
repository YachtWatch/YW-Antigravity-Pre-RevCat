import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    console.log("Checking profiles table...");
    try {
        const { data, error } = await supabase.from('profiles').select('*').limit(1);
        console.log("Profiles result:", { data, error });
    } catch (e) {
        console.error("Profiles exception:", e);
    }
}

main().catch(console.error);
