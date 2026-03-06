import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkUserSetup() {
    // 1. Get the current session user (requires us to login as a test user or we can just fetch all data via anon to see what's what, but anon can't bypass RLS)
    // Let's create a fresh captain, a fresh vessel, and a fresh crew member via auth to see where the disconnect is.

    console.log("---- RLS DEBUG SCRIPT ----");
    const testCaptEmail = `test_capt_${Date.now()}@test.com`;
    const testCrewEmail = `test_crew_${Date.now()}@test.com`;
    const password = "password123";

    // Create Captain
    console.log(`1. Signing up Captain: ${testCaptEmail}`);
    const { data: captAuth, error: captErr } = await supabase.auth.signUp({
        email: testCaptEmail,
        password,
        options: { data: { role: 'captain', full_name: 'Test Captain' } }
    });

    if (captErr || !captAuth.user) return console.error("Captain signup failed", captErr);
    const captId = captAuth.user.id;
    console.log(`Captain ID: ${captId}`);

    // Create Vessel
    console.log(`2. Creating Vessel as Captain...`);
    const vesselId = crypto.randomUUID();
    const joinCode = `TST${Date.now().toString().slice(-3)}`;
    const { data: vesselData, error: vesselErr } = await supabase.from('vessels').insert({
        id: vesselId,
        captain_id: captId,
        name: 'Debug Yacht',
        length: 50,
        type: 'motor',
        capacity: 10,
        join_code: joinCode,
        check_in_enabled: false
    }).select().single();

    if (vesselErr) return console.error("❌ Vessel create failed:", vesselErr);
    console.log(`Vessel created: ${vesselData.name} (Code: ${joinCode})`);

    // Link Captain to Vessel Members
    console.log(`3. Linking Captain to vessel_members...`);
    const { error: linkErr } = await supabase.from('vessel_members').insert({
        vessel_id: vesselId,
        user_id: captId,
        role: 'captain'
    });
    if (linkErr) return console.error("❌ Captain link failed:", linkErr);

    // Verify Captain can see the vessel
    const { data: verifyCaptVessels, error: verErr } = await supabase.from('vessels').select('*');
    if (verErr || !verifyCaptVessels || verifyCaptVessels.length === 0) {
        console.error("❌ CAPTAIN CANNOT SEE THEIR OWN VESSEL! RLS is still failing.");
    } else {
        console.log("✅ Captain RLS confirmed: Can see vessel.");
    }


    // Logout and Create Crew
    await supabase.auth.signOut();
    console.log(`\n4. Signing up Crew: ${testCrewEmail}`);
    const { data: crewAuth, error: crewErr } = await supabase.auth.signUp({
        email: testCrewEmail,
        password,
        options: { data: { role: 'crew', full_name: 'Test Crew' } }
    });

    if (crewErr || !crewAuth.user) return console.error("Crew signup failed", crewErr);
    const crewId = crewAuth.user.id;

    // Crew uses join code
    console.log(`5. Crew looking up vessel by code: ${joinCode}`);
    const { data: lookupVessel, error: lookupErr } = await supabase.from('vessels').select('*').eq('join_code', joinCode).maybeSingle();

    if (lookupErr || !lookupVessel) {
        console.error("❌ CREW CANNOT LOOKUP VESSEL! RLS is failing.", lookupErr);
    } else {
        console.log("✅ Crew RLS confirmed: Can lookup vessel.");
    }

    // Force link crew (simulating captain approval)
    console.log(`6. Simulating Captain approval (linking crew to vessel_members)...`);
    // We have to login as captain or use service key to bypass. Since we don't have service key, let's login as capt.
    await supabase.auth.signOut();
    await supabase.auth.signInWithPassword({ email: testCaptEmail, password });

    const { error: crewLinkErr } = await supabase.from('vessel_members').insert({
        vessel_id: vesselId,
        user_id: crewId,
        role: 'crew'
    });
    if (crewLinkErr) return console.error("❌ Captain adding crew failed:", crewLinkErr);

    // Verify Visibility
    console.log(`7. Verifying Visibility...`);
    // Captain checks members
    const { data: captMembers, error: captMemErr } = await supabase.from('vessel_members').select('*');
    console.log(`Captain sees ${captMembers?.length} members (EXPECTED: 2). Error:`, captMemErr);

    // Crew checks members
    await supabase.auth.signOut();
    await supabase.auth.signInWithPassword({ email: testCrewEmail, password });

    const { data: crewMembers, error: crewMemErr } = await supabase.from('vessel_members').select('*');
    console.log(`Crew sees ${crewMembers?.length} members (EXPECTED: 2). Error:`, crewMemErr);

    console.log("---- DEBUG FINISHED ----");
}

checkUserSetup();
