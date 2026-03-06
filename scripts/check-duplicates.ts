import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

// Sign in as the Firdale captain or whichever captain is having issues
// We'll list all vessels and their captain_ids to see duplicates
async function checkDuplicates() {
    const { data } = await supabase.from('vessels').select('id, name, captain_id, created_at').order('captain_id').order('created_at');

    if (!data) { console.log("No data"); return; }

    // Group by captain_id
    const byCapt: Record<string, any[]> = {};
    for (const v of data) {
        if (!byCapt[v.captain_id]) byCapt[v.captain_id] = [];
        byCapt[v.captain_id].push(v);
    }

    for (const [captId, vessels] of Object.entries(byCapt)) {
        if (vessels.length > 1) {
            console.log(`\n⚠️  Captain ${captId} owns ${vessels.length} vessels (DUPLICATE!):`);
            for (const v of vessels) {
                console.log(`   - "${v.name}" (${v.id}) created ${v.created_at}`);
            }
        }
    }

    console.log('\nAll vessels:');
    console.table(data.map(v => ({ name: v.name, captain_id: v.captain_id.slice(0, 8) + '...', created_at: v.created_at.slice(0, 10) })));
}

checkDuplicates();
