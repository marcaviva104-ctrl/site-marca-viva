/**
 * Stories Admin Manager
 * Handles uploading and managing stories (Instagram-style)
 */

const StoriesAdmin = {
    BUCKET: 'stories-media',
    TABLE: 'stories',

    async init() {
        console.log("Stories Admin Init...");
        await this.loadStories();
    },

    // --- 1. Load & Render ---

    async loadStories() {
        const container = document.getElementById('stories-list');
        if (!container) return;

        container.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8; width:100%;">Atualizando...</div>';

        const { data: stories, error } = await window.supabase
            .from(this.TABLE)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading stories:', error);
            container.innerHTML = '<div style="color:red">Erro ao carregar stories.</div>';
            return;
        }

        document.getElementById('stories-count').textContent = `${stories.length} ativos`;

        if (stories.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding:40px; border:1px dashed #e2e8f0; border-radius:12px; color:#64748b;">
                    <i class="ph-duotone ph-camera-slash" style="font-size:2rem; margin-bottom:10px;"></i><br>
                    Nenhum story ativo no momento.
                </div>`;
            return;
        }

        container.innerHTML = stories.map(story => this.renderStoryCard(story)).join('');
    },

    renderStoryCard(story) {
        const isVideo = story.media_type === 'video';
        // If images are vertical, object-fit cover works well.

        return `
            <div style="position: relative; aspect-ratio: 9/16; background: black; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); group">
                ${isVideo
                ? `<video src="${story.media_url}" style="width:100%; height:100%; object-fit:cover;" muted></video>`
                : `<img src="${story.media_url}" style="width:100%; height:100%; object-fit:cover;">`
            }
                
                <!-- Overlay Gradient -->
                <div style="position: absolute; bottom:0; left:0; width:100%; height:40%; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);"></div>

                <!-- Type Icon -->
                <div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.5); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">
                    <i class="ph-bold ${isVideo ? 'ph-film-strip' : 'ph-image'}"></i>
                </div>

                <!-- Info -->
                <div style="position: absolute; bottom: 10px; left: 10px; right: 10px; color: white;">
                    <div style="font-size: 0.75rem; opacity: 0.9;">${new Date(story.created_at).toLocaleDateString('pt-BR')}</div>
                </div>

                <!-- Delete Button (Hover) -->
                <button onclick="StoriesAdmin.deleteStory('${story.id}', '${story.media_url}')" 
                    title="Excluir Story"
                    style="position: absolute; top: 10px; left: 10px; background: #ef4444; border: none; color: white; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                    <i class="ph-bold ph-trash"></i>
                </button>
            </div>
        `;
    },

    // --- 2. Upload Logic ---

    openUploadModal() {
        // We can reuse SweetAlert for a simple file input
        Swal.fire({
            title: 'Novo Story',
            html: `
                <div style="text-align: center;">
                    <p style="color:#64748b; font-size:0.9rem; margin-bottom:20px;">
                        Selecione uma foto ou vídeo (Max 15MB).<br>
                        Formato ideal: <b>9:16 (Vertical)</b>
                    </p>
                    <input type="file" id="swal-story-input" accept="image/*,video/*" class="swal2-input" style="padding-top:10px;">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Enviar 🚀',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const file = document.getElementById('swal-story-input').files[0];
                if (!file) Swal.showValidationMessage('Selecione um arquivo!');
                return file;
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                this.uploadFile(result.value);
            }
        });
    },

    handleDrop(e) {
        e.preventDefault();
        e.target.style.background = 'white';
        e.target.style.borderColor = '#cbd5e1'; // Reset styles

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            this.uploadFile(e.dataTransfer.files[0]);
        }
    },

    async uploadFile(file) {
        // 1. Validate
        if (file.size > 100 * 1024 * 1024) { // 100MB limit
            return Swal.fire('Muito Grande', 'O arquivo deve ter no máximo 100MB.', 'warning');
        }

        const type = file.type.startsWith('image/') ? 'image' : 'video';
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

        try {
            Swal.fire({
                title: 'Enviando Story...',
                html: 'Fazendo upload da mídia.',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            // 2. Upload to Storage
            const { data, error: uploadError } = await window.supabase.storage
                .from(this.BUCKET)
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // 3. Get Public URL
            const { data: { publicUrl } } = window.supabase.storage
                .from(this.BUCKET)
                .getPublicUrl(fileName);

            // 4. Insert into DB
            const { error: dbError } = await window.supabase
                .from(this.TABLE)
                .insert([{
                    media_url: publicUrl,
                    media_type: type,
                    duration: type === 'image' ? 5 : 15, // Default 5s image, 15s video placeholder (should ideally get metadata)
                    active: true
                }]);

            if (dbError) throw dbError;

            Swal.fire('Sucesso', 'Story publicado!', 'success');
            this.loadStories(); // Refresh list

        } catch (err) {
            console.error(err);
            Swal.fire('Erro', 'Falha no upload: ' + (err.message || err), 'error');
        }
    },

    // --- 3. Delete Logic ---

    async deleteStory(id, url) {
        const { isConfirmed } = await Swal.fire({
            title: 'Excluir Story?',
            text: "Isso removerá a mídia permanentemente.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Sim, excluir'
        });

        if (!isConfirmed) return;

        try {
            Swal.showLoading();

            // 1. Delete from DB
            const { error: dbError } = await window.supabase
                .from(this.TABLE)
                .delete()
                .eq('id', id);

            if (dbError) throw dbError;

            // 2. Delete from Storage (Optional usually, but good for hygiene)
            // Extract filename from URL
            const fileName = url.split('/').pop();
            const { error: storageError } = await window.supabase.storage
                .from(this.BUCKET)
                .remove([fileName]);

            if (storageError) console.warn("Storage delete warning:", storageError);

            await Swal.fire('Excluído', 'Story removido.', 'success');
            this.loadStories();

        } catch (err) {
            Swal.fire('Erro', 'Falha ao excluir.', 'error');
        }
    }
};

// Expose globally
window.StoriesAdmin = StoriesAdmin;

// Auto-load if on stories view (rudimentary check)
document.addEventListener('DOMContentLoaded', () => {
    // If we refresh and hash is #stories, load it
    if (window.location.hash === '#stories') {
        StoriesAdmin.init();
    }
});
