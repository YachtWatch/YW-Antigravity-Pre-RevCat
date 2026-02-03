
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
    console.log('Checking connection to:', supabaseUrl);

    // 1. Check Profiles
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    if (pError) {
        console.error('Error fetching profiles:', pError);
    } else {
        console.log(`Found ${profiles?.length || 0} profiles:`);
        profiles?.forEach(p => console.log(` - ${p.email} (${p.role})`));
    }

    // 2. Check Vessels
    const { data: vessels, error: vError } = await supabase.from('vessels').select('*');
    if (vError) {
        console.error('Error fetching vessels:', vError);
    } else {
        console.log(`Found ${vessels?.length || 0} vessels:`);
        vessels?.forEach(v => console.log(` - ${v.name} (${v.join_code})`));
    }
}

verify();
