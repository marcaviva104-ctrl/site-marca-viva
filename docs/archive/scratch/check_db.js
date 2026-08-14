const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkSchema() {
    // Read config to get URL/Key
    const configPath = 'C:\\Users\\Leivin Jesus\\OneDrive\\Desktop\\SiteMarcaViva\\scripts\\config\\config.js';
    const content = fs.readFileSync(configPath, 'utf8');

    const urlMatch = content.match(/SUPABASE_URL\s*:\s*['"]([^'"]+)['"]/);
    const keyMatch = content.match(/SUPABASE_ANON_KEY\s*:\s*['"]([^'"]+)['"]/);

    if (!urlMatch || !keyMatch) {
        console.error("Could not find Supabase config");
        process.exit(1);
    }

    const supabase = createClient(urlMatch[1], keyMatch[1]);

    console.log("Checking protocol_items columns...");
    // Try to get one item to see its structure
    const { data, error } = await supabase.from('protocol_items').select('*').limit(1);

    if (error) {
        console.error("Error:", error);
    } else if (data && data.length > 0) {
        console.log("Columns found:", Object.keys(data[0]));
        console.log("Sample item:", JSON.stringify(data[0], null, 2));
    } else {
        console.log("No data found in protocol_items");
    }
}

checkSchema();
