
// Storage Manager for handling file uploads
const StorageManager = {
    BUCKET_NAME: 'products',

    // Initialize (Optional: Check if bucket exists/public)
    async init() {
        console.log("StorageManager: Initialized");
    },

    // Upload a file and return the public URL
    async uploadFile(file, folder = 'images') {
        if (!window.supabase) {
            console.error("StorageManager: Supabase not found");
            return null;
        }

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

            const { data, error } = await window.supabase.storage
                .from(this.BUCKET_NAME)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get Public URL
            const { data: publicData } = window.supabase.storage
                .from(this.BUCKET_NAME)
                .getPublicUrl(fileName);

            return publicData.publicUrl;

        } catch (error) {
            console.error("StorageManager: Upload Failed", error);
            Swal.fire('Erro no Upload', 'Falha ao enviar imagem. Verifique se o Bucket "products" existe no Supabase.', 'error');
            return null;
        }
    }
};

window.StorageManager = StorageManager;
