import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qnudbyhnqtsxlqwgkmal.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudWRieWhucXRzeGxxd2drbWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTM2NjMsImV4cCI6MjA4MzI4OTY2M30.eedi0r5O0XWXV8UhoELO7HfauxX01d3JbZBh82JgCIQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
    console.log("Fetching a single product to see schema...");
    const { data, error } = await supabase.from('products').select('*').limit(1);
    if (error) {
        console.error("Error:", error);
    } else {
        if (data && data.length > 0) {
            console.log("Columns:", Object.keys(data[0]));
        } else {
            console.log("Table is empty. Inserting a test product...");
            const { error: insError } = await supabase.from('products').insert({ id: 'test', name: 'test' });
            console.log("Insert Error (to see what is missing/required):", insError);
        }
    }
}

test();
