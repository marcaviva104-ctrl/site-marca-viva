import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Assuming config.js has the keys, but we can also extract from html.
// We'll read from admin.html to get keys.
import fs from 'fs';

const htmlContent = fs.readFileSync('admin.html', 'utf-8');
const supabaseUrlMatch = htmlContent.match(/const SUPABASE_URL = '([^']+)'/);
const supabaseKeyMatch = htmlContent.match(/const SUPABASE_KEY = '([^']+)'/);

if (!supabaseUrlMatch || !supabaseKeyMatch) {
    console.error("Could not find Supabase credentials in admin.html");
    process.exit(1);
}

const supabaseUrl = supabaseUrlMatch[1];
const supabaseKey = supabaseKeyMatch[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDatabase() {
    console.log("Cleaning database... keeping only MV-2026-0002");

    // Get all protocols except MV-2026-0002
    const { data: protocols, error: selectError } = await supabase
        .from('protocols')
        .select('id')
        .neq('id', 'MV-2026-0002');

    if (selectError) {
        console.error("Error fetching protocols:", selectError);
        return;
    }

    if (protocols.length === 0) {
        console.log("No protocols to delete.");
        return;
    }

    const idsToDelete = protocols.map(p => p.id);
    console.log(`Found ${idsToDelete.length} protocols to delete.`);

    // Delete protocol_items first due to foreign keys
    const { error: itemsError } = await supabase
        .from('protocol_items')
        .delete()
        .in('protocol_id', idsToDelete);

    if (itemsError) {
        console.error("Error deleting protocol items:", itemsError);
    } else {
        console.log("Deleted protocol items successfully.");
    }

    // Delete protocols
    const { error: deleteError } = await supabase
        .from('protocols')
        .delete()
        .in('id', idsToDelete);

    if (deleteError) {
        console.error("Error deleting protocols:", deleteError);
    } else {
        console.log("Deleted protocols successfully.");
    }
}

cleanDatabase();
