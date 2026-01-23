/**
 * Stories Admin Manager (With Highlights)
 * Handles uploading and managing stories organized by Highlights (Folders).
 */

const StoriesAdmin = {
    BUCKET: 'stories-media',
    TABLE_STORIES: 'stories',
    TABLE_HIGHLIGHTS: 'highlights',

    highlights: [],

    async init() {
        console.log("Stories Admin Init (Highlights V2)...");
        await this.loadHighlights();
        await this.loadStories();
    },

    // --- 1. Load Data ---

    async loadHighlights() {
        const container = document.getElementById('highlights-container-admin');
        // Keep the "New" button (first child)
        if (!container) return;

        // Fetch
        const { data, error } = await window.supabase
            .from(this.TABLE_HIGHLIGHTS)
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error loading highlights:", error);
            return;
        }

        this.highlights = data || [];
        this.renderHighlights();
    },

    renderHighlights() {
        const container = document.getElementById('highlights-container-admin');
        const addButton = container.firstElementChild.outerHTML; // Preserve the "New" button

        const html = this.highlights.map(h => `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 70px; position:relative; group">
                <div style="width: 70px; height: 70px; border-radius: 50%; padding: 2px; border: 2px solid #e2e8f0; position:relative;">
                    <img src="${h.cover_url || 'https://via.placeholder.com/70'}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">
                </div>
                <span style="font-size: 0.75rem; color: #334155; font-weight: 500; text-align:center; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${h.title}
                </span>
                
                <!-- Delete Highlight Btn -->
                <button onclick="StoriesAdmin.deleteHighlight('${h.id}')" 
                    style="position:absolute; top:-5px; right:-5px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:0.7rem; align-items:center; justify-content:center; display:flex;">
                    x
                </button>
            </div>
        `).join('');

        container.innerHTML = addButton + html;
    },

    async loadStories() {
        const container = document.getElementById('stories-list');
        if (!container) return;

        container.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8; width:100%;">Atualizando...</div>';

        const { data: stories, error } = await window.supabase
            .from(this.TABLE_STORIES)
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
                    Nenhum story ativo.<br>
                    <small>Arraste uma foto/vídeo acima para começar.</small>
                </div>`;
            return;
        }

        container.innerHTML = stories.map(story => this.renderStoryCard(story)).join('');
    },

    renderStoryCard(story) {
        const isVideo = story.media_type === 'video';
        // Find highlight title
        const highlight = this.highlights.find(h => h.id === story.highlight_id);
        const highlightName = highlight ? highlight.title : 'Geral';

        return `
            <div style="position: relative; aspect-ratio: 9/16; background: black; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); group">
                ${isVideo
                ? `<video src="${story.media_url}" style="width:100%; height:100%; object-fit:cover;" muted></video>`
                : `<img src="${story.media_url}" style="width:100%; height:100%; object-fit:cover;">`
            }
                
                <div style="position: absolute; bottom:0; left:0; width:100%; height:40%; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);"></div>

                <!-- Highlight Tag -->
                <div style="position: absolute; top: 10px; left: 10px; background: rgba(255,255,255,0.2); backdrop-filter:blur(4px); color: white; border-radius: 4px; padding: 2px 6px; font-size: 0.65rem; font-weight: 600;">
                    ${highlightName}
                </div>

                <!-- Type Icon -->
                <div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.5); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">
                    <i class="ph-bold ${isVideo ? 'ph-film-strip' : 'ph-image'}"></i>
                </div>

                <button onclick="StoriesAdmin.deleteStory('${story.id}', '${story.media_url}')" 
                    title="Excluir Story"
                    style="position: absolute; bottom: 10px; right: 10px; background: #ef4444; border: none; color: white; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                    <i class="ph-bold ph-trash"></i>
                </button>
            </div>
        `;
    },

    // --- 2. Create Highlight ---

    async createHighlight() {
        // 1. Ask for Title
        const { value: title } = await Swal.fire({
            title: 'Nova Pasta (Destaque)',
            input: 'text',
            inputLabel: 'Nome da Pasta (ex: Canetas, Cadernos)',
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) return 'Você precisa dar um nome!';
            }
        });

        if (!title) return;

        // 2. Ask for Cover Image
        const { value: file } = await Swal.fire({
            title: 'Capa do Destaque',
            text: 'Escolha uma imagem pequena para o ícone.',
            input: 'file',
            inputAttributes: {
                'accept': 'image/*',
                'aria-label': 'Upload da imagem de capa'
            },
            showCancelButton: true
        });

        if (!file) return;

        try {
            Swal.fire({ title: 'Criando pasta...', didOpen: () => Swal.showLoading() });

            // Upload Cover
            const ext = file.name.split('.').pop();
            const fileName = `covers/${Date.now()}_${title.replace(/\s+/g, '_')}.${ext}`;

            const { error: upErr } = await window.supabase.storage
                .from(this.BUCKET)
                .upload(fileName, file);

            if (upErr) throw upErr;

            const { data: { publicUrl } } = window.supabase.storage
                .from(this.BUCKET)
                .getPublicUrl(fileName);

            // Insert DB
            const { error: dbErr } = await window.supabase
                .from(this.TABLE_HIGHLIGHTS)
                .insert([{ title, cover_url: publicUrl, active: true }]);

            if (dbErr) throw dbErr;

            Swal.fire('Sucesso', 'Pasta criada!', 'success');
            this.loadHighlights();

        } catch (err) {
            Swal.fire('Erro', err.message, 'error');
        }
    },

    async deleteHighlight(id) {
        // Confirmation: Deleting a highlight deletes ALL stories in it (because of ON DELETE CASCADE in SQL)
        const { isConfirmed } = await Swal.fire({
            title: 'Excluir Pasta?',
            text: "Cuidado: Isso vai apagar TODOS os stories dentro dela também!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sim, apagar tudo'
        });

        if (!isConfirmed) return;

        try {
            Swal.showLoading();
            const { error } = await window.supabase
                .from(this.TABLE_HIGHLIGHTS)
                .delete()
                .eq('id', id);

            if (error) throw error;

            Swal.fire('Apagado', 'Pasta removida.', 'success');
            // Refresh both lists
            this.loadHighlights();
            this.loadStories();
        } catch (err) {
            console.error(err);
            Swal.fire('Erro', 'Falha ao excluir.', 'error');
        }
    },

    // --- 3. Upload Story Logic ---

    openUploadModal() {
        if (this.highlights.length === 0) {
            return Swal.fire('Atenção', 'Crie pelo menos uma Pasta (Destaque) antes de enviar um story!', 'warning');
        }

        // Build generic Select options for SweetAlert
        const options = {};
        this.highlights.forEach(h => options[h.id] = h.title);

        Swal.fire({
            title: 'Novo Story',
            html: `
                <div style="text-align: left;">
                    <label style="display:block; margin-bottom:5px; font-weight:600; color:#334155;">1. Escolha a Mídia</label>
                    <input type="file" id="swal-story-input" accept="image/*,video/*" class="swal2-input" style="margin:0 0 15px 0; width:100%;">
                    
                    <label style="display:block; margin-bottom:5px; font-weight:600; color:#334155;">2. Selecione a Pasta</label>
                    <select id="swal-highlight-select" class="swal2-select" style="display:flex; width:100%; margin:0;">
                        ${this.highlights.map(h => `<option value="${h.id}">${h.title}</option>`).join('')}
                    </select>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Enviar 🚀',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const file = document.getElementById('swal-story-input').files[0];
                const highlightId = document.getElementById('swal-highlight-select').value;

                if (!file) return Swal.showValidationMessage('Selecione um arquivo!');
                if (!highlightId) return Swal.showValidationMessage('Selecione uma pasta!');

                return { file, highlightId };
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                this.uploadFile(result.value.file, result.value.highlightId);
            }
        });
    },

    handleDrop(e) {
        e.preventDefault();
        e.target.style.background = 'white';
        e.target.style.borderColor = '#cbd5e1';

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            // Direct drag & drop needs to ask for Highlight. 
            // We'll reopen the modal pre-filled? Or just ask for highlight.
            // Easier: Just pass the file and ask for Highlight in a specialized modal.
            this.promptHighlightForDrop(e.dataTransfer.files[0]);
        }
    },

    async promptHighlightForDrop(file) {
        if (this.highlights.length === 0) {
            return Swal.fire('Atenção', 'Crie pelo menos uma Pasta (Destaque) primeiro!', 'warning');
        }

        const { value: highlightId } = await Swal.fire({
            title: 'Para qual pasta?',
            input: 'select',
            inputOptions: this.highlights.reduce((acc, h) => ({ ...acc, [h.id]: h.title }), {}),
            inputPlaceholder: 'Selecione...',
            showCancelButton: true
        });

        if (highlightId) {
            this.uploadFile(file, highlightId);
        }
    },

    async uploadFile(file, highlightId) {
        if (file.size > 100 * 1024 * 1024) {
            return Swal.fire('Muito Grande', 'Max 100MB.', 'warning');
        }

        const type = file.type.startsWith('image/') ? 'image' : 'video';
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

        try {
            Swal.fire({
                title: 'Enviando...',
                html: 'Fazendo upload da mídia.',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            // 1. Upload
            const { error: uploadError } = await window.supabase.storage
                .from(this.BUCKET)
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = window.supabase.storage
                .from(this.BUCKET)
                .getPublicUrl(fileName);

            // 2. Insert with Highlight ID
            const { error: dbError } = await window.supabase
                .from(this.TABLE_STORIES)
                .insert([{
                    media_url: publicUrl,
                    media_type: type,
                    duration: type === 'image' ? 5 : 15,
                    active: true,
                    highlight_id: highlightId
                }]);

            if (dbError) throw dbError;

            Swal.fire('Sucesso', 'Salvo na pasta!', 'success');
            this.loadStories();

        } catch (err) {
            console.error(err);
            Swal.fire('Erro', 'Falha no upload.', 'error');
        }
    },

    async deleteStory(id, url) {
        const { isConfirmed } = await Swal.fire({
            title: 'Excluir?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Sim'
        });

        if (!isConfirmed) return;

        try {
            Swal.showLoading();
            await window.supabase.from(this.TABLE_STORIES).delete().eq('id', id);

            // Try delete file
            const fileName = url.split('/').pop();
            await window.supabase.storage.from(this.BUCKET).remove([fileName]);

            Swal.fire('Excluído', '', 'success');
            this.loadStories();
        } catch (err) {
            Swal.fire('Erro', err.message, 'error');
        }
    }
};

window.StoriesAdmin = StoriesAdmin;
