// Initialize Supabase Client
// Depends on: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// Depends on: scripts/config/config.js (defines SUPABASE_URL and SUPABASE_KEY)

// We need to ensure 'supabase' is available globally for auth.js and products.js
// The CDN script creates 'window.supabase' as the factory with .createClient

if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    const { createClient } = window.supabase;

    // Debug: Check if config vars are available
    console.log('Supabase Config Check:', {
        url: window.SUPABASE_URL,
        keyLength: window.SUPABASE_KEY?.length
    });

    // detectSessionInUrl: essencial para magic link e recuperação de senha (#access_token no URL)
    window.supabase = createClient(window.SUPABASE_URL, window.SUPABASE_KEY, {
        auth: {
            detectSessionInUrl: true,
            autoRefreshToken: true,
            persistSession: true
        }
    });
    console.log("Supabase Client Initialized and attached to window.supabase");
} else if (typeof createClient !== 'undefined') {
    // If loaded differently (e.g. module)
    window.supabase = createClient(window.SUPABASE_URL, window.SUPABASE_KEY, {
        auth: {
            detectSessionInUrl: true,
            autoRefreshToken: true,
            persistSession: true
        }
    });
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
