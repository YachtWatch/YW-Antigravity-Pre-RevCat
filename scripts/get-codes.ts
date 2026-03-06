import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCodes() {
    const testEmail = `probe_${Date.now()}@test.com`;
    const password = "password123";

    await supabase.auth.signUp({
        email: testEmail,
        password,
        options: { data: { role: 'crew', full_name: 'Probe Crew' } }
    });

    await supabase.auth.signInWithPassword({ email: testEmail, password });

    const { data } = await supabase.from('vessels').select('id, name, join_code');
    console.log("Existing Vessels (Authenticated):");
    if (data && data.length > 0) {
        console.table(data);
    } else {
        console.log("No vessels found even when authenticated.");
    }
}

checkCodes();
