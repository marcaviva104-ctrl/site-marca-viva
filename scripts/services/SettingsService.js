/**
 * SettingsService
 * Responsible for fetching and syncing global settings from the Supabase site_settings table.
 */

const SettingsService = {
    async getGlobalSettings() {
        if (!window.supabase) return null;

        try {
            const { data, error } = await window.supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'global_settings')
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows returned, return null so defaults can be used
                    return null;
                }
                throw error;
            }

            return data.value;
        } catch (err) {
            console.error("Error fetching global settings from DB:", err);
            return null;
        }
    },

    async saveGlobalSettings(settings) {
        if (!window.supabase) throw new Error("Supabase not initialized");

        try {
            // Upsert the global settings row
            const { error } = await window.supabase
                .from('site_settings')
                .upsert(
                    { key: 'global_settings', value: settings, updated_at: new Date() },
                    { onConflict: 'key' }
                );

            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Error saving global settings to DB:", err);
            throw err;
        }
    }
};

window.SettingsService = SettingsService;
