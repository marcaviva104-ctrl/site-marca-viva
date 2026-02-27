
// Storage Manager for handling file uploads
const StorageManager = {
    BUCKET_NAME: 'products',

    // Initialize (Optional: Check if bucket exists/public)
    async init() {
        console.log("StorageManager: Initialized");
    },

    // Upload a file and return the public URL
    async uploadFile(file, folder = 'images', bucket = 'products') {
        if (!window.supabase) {
            console.error("StorageManager: Supabase not found");
            return null;
        }

        try {
            const fileExt = file.name.split('.').pop();
            // Sanitize filename to avoid issues
            const safeName = Math.random().toString(36).substring(2) + Date.now();
            const fileName = `${folder}/${safeName}.${fileExt}`;

            const { data, error } = await window.supabase.storage
                .from(bucket)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get Public URL
            const { data: publicData } = window.supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

            return publicData.publicUrl;

        } catch (error) {
            console.error("StorageManager: Upload Failed", error);
            throw error; // Propagate error to caller
        }
    },

    // Upload files larger than standard gateway limits using TUS protocol
    async uploadLargeFile(file, folder = 'images', bucket = 'products', onProgress) {
        if (!window.supabase) {
            console.error("StorageManager: Supabase not found");
            return null;
        }

        if (!window.tus) {
            console.error("StorageManager: TUS client not found. Falling back to normal upload.");
            return this.uploadFile(file, folder, bucket);
        }

        return new Promise(async (resolve, reject) => {
            try {
                const fileExt = file.name.split('.').pop();
                // Sanitize filename to avoid weird characters breaking the link
                const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
                const safeName = Math.random().toString(36).substring(2) + Date.now() + '_' + cleanName;
                const fileName = `${folder}/${safeName}`;

                // Extract Project Reference from supabaseUrl to form the TUS Endpoint
                const supabaseUrl = window.SUPABASE_URL || localStorage.getItem('supabase_url');
                // Alternatively, can resolve through supabase config if exposed, but standard url works:
                const { data: sessionData } = await window.supabase.auth.getSession();
                const session = sessionData?.session;

                // TUS endpoint pattern for supabase: https://[project].supabase.co/storage/v1/upload/resumable
                const resumableEndpoint = `${supabaseUrl}/storage/v1/upload/resumable`;

                console.log("StorageManager: Starting Resumable TUS Upload for", fileName);

                const upload = new tus.Upload(file, {
                    endpoint: resumableEndpoint,
                    retryDelays: [0, 3000, 5000, 10000, 20000], // Retry strategy if connection breaks
                    headers: {
                        authorization: `Bearer ${session ? session.access_token : window.SUPABASE_KEY}`,
                        'x-upsert': 'true', // Important for Supabase TUS
                    },
                    uploadDataDuringCreation: true,
                    removeFingerprintOnSuccess: true, // Cleanup localstorage
                    metadata: {
                        bucketName: bucket,
                        objectName: fileName,
                        contentType: file.type || 'application/pdf',
                        cacheControl: '3600',
                    },
                    chunkSize: 30 * 1024 * 1024, // 30MB chunks para acelerar (menos viagens ao servidor)
                    onError: function (error) {
                        console.error('TUS Upload Error:', error);
                        reject(error);
                    },
                    onProgress: function (bytesUploaded, bytesTotal) {
                        const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(0);
                        if (onProgress) {
                            onProgress(percentage);
                        }
                    },
                    onSuccess: function () {
                        // TUS Finished successfully.
                        // We must fetch the public URL manually just like the standard upload
                        const { data } = window.supabase.storage
                            .from(bucket)
                            .getPublicUrl(fileName);

                        console.log("StorageManager: TUS Upload Success", data.publicUrl);
                        resolve(data.publicUrl);
                    }
                });

                // Start chunked upload
                upload.start();

            } catch (err) {
                console.error("StorageManager: Setup TUS Failed", err);
                reject(err);
            }
        });
    }
};

window.StorageManager = StorageManager;
