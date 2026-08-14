const fetch = require('node-fetch') || globalThis.fetch;

async function run() {
    const url = 'https://qnudbyhnqtsxlqwgkmal.supabase.co/rest/v1/products?select=id,name,category,subcategory,active&limit=5';
    const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudWRieWhucXRzeGxxd2drbWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTM2NjMsImV4cCI6MjA4MzI4OTY2M30.eedi0r5O0XWXV8UhoELO7HfauxX01d3JbZBh82JgCIQ';
    
    try {
        const res = await fetch(url, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch(e) {
        console.error(e);
    }
}
run();
