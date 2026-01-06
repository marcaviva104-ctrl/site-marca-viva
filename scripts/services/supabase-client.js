// Initialize Supabase Client
// Depends on: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// Depends on: scripts/config.js (defines SUPABASE_URL and SUPABASE_KEY)

// We need to ensure 'supabase' is available globally for auth.js and products.js
// The CDN script creates 'window.supabase' as the factory with .createClient

if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    const { createClient } = window.supabase;
    // Overwrite the global variable with the initialized CLIENT instance
    window.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase Client Initialized and attached to window.supabase");
} else if (typeof createClient !== 'undefined') {
    // If loaded differently (e.g. module)
    window.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase Client Initialized (Direct) and attached to window.supabase");
} else {
    console.error("CRITICAL: Supabase SDK not loaded. Include the CDN script first.");
}

// Helper to check connection (optional debug)
async function checkSupabaseConnection() {
    if (!window.supabase) return false;
    try {
        const { data, error } = await window.supabase.from('products').select('count', { count: 'exact', head: true });
        if (error) {
            console.warn("Supabase Connection Warning:", error.message);
        } else {
            console.log("Supabase Connection Successful!");
        }
        return true;
    } catch (err) {
        console.error("Supabase Connection Error:", err);
        return false;
    }
}
