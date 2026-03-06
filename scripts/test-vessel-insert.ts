import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    // We need to sign in first because RLS is probably enabled!
    // Let's create a test user first.
    const testEmail = `test_capt_${Date.now()}@example.com`;
    const testPassword = 'password123';

    console.log("Signing up test user...");
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
            data: { role: 'captain', name: 'Test Captain' }
        }
    });

    if (authError) {
        console.error("Auth error:", authError);
        return;
    }

    console.log("Logged in user ID:", authData.user?.id);

    const testId = crypto.randomUUID();

    console.log("Attempting insert vessel...");
    const { data: vesselData, error: vesselError } = await supabase.from('vessels').insert([{
        id: testId,
        captain_id: authData.user?.id,
        name: 'Test Vessel dbg',
        length: 10,
        type: 'motor',
        capacity: 10,
        join_code: `TST${Date.now().toString().slice(-3)}`,
        check_in_enabled: true
    }]);

    console.log("Vessel insert result:", { vesselData, vesselError });

    if (!vesselError) {
        console.log("Attempting insert vessel_members...");
        const { data: memberData, error: memberError } = await supabase.from('vessel_members').insert([{
            vessel_id: testId,
            user_id: authData.user?.id,
            role: 'captain'
        }]);
        console.log("Vessel members insert result:", { memberData, memberError });
    }
}

main().catch(console.error);
