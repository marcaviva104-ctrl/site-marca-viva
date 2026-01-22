const { createClient } = require('@supabase/supabase-js');

// Config from project
const SUPABASE_URL = 'https://qnudbyhnqtsxlqwgkmal.supabase.co';
const SUPABASE_KEY = 'sb_publishable_AMo1o9yvNV-p_qSE2j5Ztw_7CM1oYeL'; // Public Key

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verify() {
    console.log("Checking Yeslena's status...");

    // Check Profiles Table
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'romeroyeslenaz09@gmail.com');

    if (error) {
        console.error("Error connecting to Supabase:", error.message);
    } else {
        if (data.length === 0) {
            console.log("❌ User 'Yeslena' not found in profiles.");
        } else {
            const user = data[0];
            console.log("--------------------------------");
            console.log(`User: ${user.full_name} (${user.email})`);
            console.log(`Approved: ${user.approved} (Type: ${typeof user.approved})`);
            console.log(`Role: ${user.role}`);
            console.log("--------------------------------");

            if (user.approved === true) {
                console.log("✅ CONCLUSION: Database IS updated. It works!");
            } else {
                console.log("⚠️ CONCLUSION: Database is NOT updated yet. User is still pending.");
            }
        }
    }
}

verify();
