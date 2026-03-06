import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

async function fetchSchema() {
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
        if (!response.ok) {
            console.error(`Status ${response.status}: ${response.statusText}`);
            return;
        }

        const data = await response.json();

        console.log("=== TABLES IN CURRENT SCHEMA ===");
        const definitions = data.definitions || data.components?.schemas || {};
        for (const [tableName, definition] of Object.entries(definitions)) {
            console.log(`\nTable: ${tableName}`);
            const properties = (definition as any).properties || {};
            for (const [propName, propDetails] of Object.entries(properties)) {
                console.log(`  - ${propName}: ${(propDetails as any).type} (${(propDetails as any).format || 'no format'})`);
            }
        }
    } catch (e) {
        console.error("Failed to fetch schema", e);
    }
}

fetchSchema();
