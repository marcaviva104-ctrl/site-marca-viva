// admin-categories.js
// Responsável por gerenciar as categorias e subcategorias no Painel Mães/Filhas

const CategoryApp = {
    tree: [], // Formato: [{id, name, subs: [{id, name}]} ]
    rawData: [],
    selectedParentId: null,

    async init() {
        console.log("CategoryApp initialized");
        await this.loadData();
    },

    async loadData() {
        if (!window.supabase) return;
        
        try {
            const { data, error } = await window.supabase
                .from('categories')
                .select('*')
                .order('name');
            
            if (error) throw error;
            
            this.rawData = data;
            this.buildTree();
            this.renderParents();
        } catch (error) {
            console.error('Error fetching categories:', error);
            if(window.Swal) Swal.fire('Erro', 'Falha ao buscar categorias do banco: ' + error.message, 'error');
        }
    },

    buildTree() {
        const parents = this.rawData.filter(c => !c.parent_id);
        const children = this.rawData.filter(c => c.parent_id);

        this.tree = parents.map(p => {
            return {
                ...p,
                subs: children.filter(c => c.parent_id === p.id)
            };
        });
    },

    renderParents() {
        const container = document.getElementById('cat-tree-mains');
        if (!container) return;

        if (this.tree.length === 0) {
            container.innerHTML = `<div style="padding:20px; text-align:center; color:#94a3b8;">Nenhuma Categoria Mãe encontrada.</div>`;
            return;
        }

        let html = '';
        this.tree.forEach(p => {
            const isSelected = p.id === this.selectedParentId;
            const bg = isSelected ? '#f0f9ff' : '#ffffff';
            const border = isSelected ? 'border-left: 4px solid #3b82f6;' : 'border-left: 4px solid transparent;';
            const color = isSelected ? '#0f172a' : '#475569';
            
            html += `
                <div style="${border} background:${bg}; padding: 15px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s;"
                     onclick="CategoryApp.selectParent('${p.id}')">
                    <div style="display:flex; align-items:center; gap:10px; color:${color}; font-weight: ${isSelected ? '600' : '500'};">
                        <i class="ph-duotone ph-folder" style="color: #3b82f6; font-size:1.2rem;"></i>
                        ${p.name}
                    </div>
                    <div style="display:flex; gap:10px;">
                        <span style="font-size:0.75rem; background:#e2e8f0; padding:2px 8px; border-radius:10px; color:#64748b;">
                            ${p.subs.length} filhas
                        </span>
                        <button onclick="event.stopPropagation(); CategoryApp.deleteCategory('${p.id}')" style="background:none; border:none; color:#ef4444; cursor:pointer;" title="Deletar">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        if (this.selectedParentId) {
            this.renderSubs(this.selectedParentId);
        } else {
            document.getElementById('cat-tree-subs').innerHTML = `<div style="padding:20px; text-align:center; color:#94a3b8; font-style:italic;">Selecione uma categoria mãe ao lado para ver e adicionar subcategorias.</div>`;
            document.getElementById('btn-add-subcat').style.display = 'none';
        }
    },

    selectParent(id) {
        this.selectedParentId = id;
        this.renderParents(); // Re-render to show selection styling
        this.renderSubs(id);
    },

    renderSubs(parentId) {
        const container = document.getElementById('cat-tree-subs');
        const titleEl = document.getElementById('cat-tree-subs-title');
        const btnAdd = document.getElementById('btn-add-subcat');

        if (!container) return;

        const parent = this.tree.find(p => p.id === parentId);
        if (!parent) return;

        titleEl.textContent = `Visualizando filhas de: ${parent.name}`;
        btnAdd.style.display = 'inline-flex';

        if (parent.subs.length === 0) {
            container.innerHTML = `<div style="padding:20px; text-align:center; color:#94a3b8; font-style:italic;">Esta categoria mãe ainda não possui subcategorias. Clique no botão acima para adicionar a primeira!</div>`;
            return;
        }

        let html = '';
        parent.subs.forEach(sub => {
            html += `
                <div style="background: #ffffff; padding: 12px 15px; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <div style="display:flex; align-items:center; gap:12px; color:#475569; font-weight: 500;">
                        <i class="ph-duotone ph-git-merge" style="color: #6366f1;"></i>
                        ${sub.name}
                    </div>
                    <button onclick="CategoryApp.deleteCategory('${sub.id}')" style="background:none; border:none; color:#ef4444; cursor:pointer; padding: 5px; border-radius:4px; transition:0.2s;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='transparent'" title="Deletar Subcategoria">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                </div>
            `;
        });
        
        container.innerHTML = html;
    },

    async createRootCategory() {
        if (!window.Swal) return;
        const { value: name } = await Swal.fire({
            title: 'Nova Categoria Mãe',
            input: 'text',
            inputLabel: 'Qual o nome da Categoria Principal? (Ex: Vestuário)',
            inputPlaceholder: 'Digite o nome aqui...',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            inputValidator: (value) => {
                if (!value || !value.trim()) {
                    return 'Você precisa digitar um nome!'
                }
            }
        });

        if (name) {
            this.saveToDB({ name: name.trim(), parent_id: null });
        }
    },

    async createSubCategory() {
        if (!this.selectedParentId || !window.Swal) return;
        
        const parent = this.tree.find(p => p.id === this.selectedParentId);

        const { value: name } = await Swal.fire({
            title: 'Nova Subcategoria',
            input: 'text',
            inputLabel: `Qual o nome da subcategoria de ${parent.name}?`,
            inputPlaceholder: 'Ex: Canetas',
            showCancelButton: true,
            confirmButtonColor: '#3b82f6',
            inputValidator: (value) => {
                if (!value || !value.trim()) {
                    return 'Você precisa digitar um nome!'
                }
            }
        });

        if (name) {
            this.saveToDB({ name: name.trim(), parent_id: this.selectedParentId });
        }
    },

    async saveToDB(payload) {
        if (!window.supabase) return;
        
        // Auto-gerar slug a partir do nome
        payload.slug = payload.name.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/\\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        try {
            Swal.fire({ title: 'Salvando...', allowOutsideClick: false });
            Swal.showLoading();

            const { data, error } = await window.supabase
                .from('categories')
                .insert([payload]);

            if (error) throw error;
            
            Swal.close();
            await this.loadData();
            
            Swal.fire({
                toast: true, position: 'top-end', icon: 'success',
                title: 'Salvo com sucesso!', showConfirmButton: false, timer: 3000
            });
            
        } catch (err) {
            console.error(err);
            Swal.fire('Erro', 'Não foi possível salvar na nuvem: ' + err.message, 'error');
        }
    },

    async deleteCategory(id) {
        if (!window.Swal || !window.supabase) return;
        
        const result = await Swal.fire({
            title: 'Atenção!',
            text: "Deseja realmente apagar esta categoria? (Subcategorias filhas também serão apagadas)",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sim, Apagar!'
        });

        if (result.isConfirmed) {
            try {
                Swal.fire({ title: 'Apagando...', allowOutsideClick: false });
                Swal.showLoading();

                const { error } = await window.supabase.from('categories').delete().eq('id', id);
                if (error) throw error;
                
                // Se for a categoria mãe selecionada atualmente, deselecionar
                if (this.selectedParentId === id) this.selectedParentId = null;

                Swal.close();
                await this.loadData();
                
            } catch(e) {
                console.error(e);
                Swal.fire('Erro', 'Erro ao apagar: ' + e.message, 'error');
            }
        }
    }
};

// Initialize when dashboard loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait a brief moment to ensure Supabase client is ready
    setTimeout(() => {
        CategoryApp.init();
    }, 1000);
});
