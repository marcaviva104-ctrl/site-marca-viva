/**
 * admin-features.js
 * Funcionalidades novas do painel admin:
 *  - Feature 1: Filtro de busca rapida (Insumos & Estoque)
 *  - Feature 2: Editar pedido ao clicar (Financeiro)
 *  - Feature 3: Produtos por subcategoria (Catalogo)
 *  - Feature 4: Gerar codigo automatico de produto (SKU)
 */

document.addEventListener('DOMContentLoaded', () => {

    // ===================================================================
    // FEATURES 1, 2, 4: Injeta no adminApp
    // ===================================================================

    const injectFeatures = () => {
        if (typeof adminApp === 'undefined') {
            setTimeout(injectFeatures, 300);
            return;
        }

        // ----- FEATURE 1: Filtros de Busca Rapida -----

        adminApp.filterInputsTable = function(query) {
            const tbody = document.getElementById('inputs-table-body');
            if (!tbody) return;
            const rows = tbody.querySelectorAll('tr');
            const q = (query || '').toLowerCase().trim();
            let visible = 0;
            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                const show = !q || text.includes(q);
                row.style.display = show ? '' : 'none';
                if (show) visible++;
            });
            const badge = document.getElementById('inputs-count-badge');
            if (badge) badge.textContent = q
                ? (visible + ' resultado' + (visible !== 1 ? 's' : ''))
                : (rows.length > 0 ? rows.length + ' itens' : '');
        };

        adminApp.filterInventoryTable = function(query) {
            const tbody = document.getElementById('inventory-overview-body');
            if (!tbody) return;
            const rows = tbody.querySelectorAll('tr');
            const q = (query || '').toLowerCase().trim();
            let visible = 0;
            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                const show = !q || text.includes(q);
                row.style.display = show ? '' : 'none';
                if (show) visible++;
            });
            const badge = document.getElementById('inventory-count-badge');
            if (badge) badge.textContent = q
                ? (visible + ' resultado' + (visible !== 1 ? 's' : ''))
                : (rows.length > 0 ? rows.length + ' itens' : '');
        };

        // Atualiza badge apos renderizar tabelas
        const origRenderInputs = adminApp.renderInputsTable && adminApp.renderInputsTable.bind(adminApp);
        if (origRenderInputs) {
            adminApp.renderInputsTable = async function() {
                await origRenderInputs();
                const searchEl = document.getElementById('inputs-search');
                if (searchEl && searchEl.value) {
                    adminApp.filterInputsTable(searchEl.value);
                } else {
                    const tbody = document.getElementById('inputs-table-body');
                    const badge = document.getElementById('inputs-count-badge');
                    if (tbody && badge) badge.textContent = tbody.querySelectorAll('tr').length + ' itens';
                }
            };
        }

        const origRenderInvOverview = adminApp.renderInventoryOverview && adminApp.renderInventoryOverview.bind(adminApp);
        if (origRenderInvOverview) {
            adminApp.renderInventoryOverview = function() {
                origRenderInvOverview();
                setTimeout(() => {
                    const searchEl = document.getElementById('inventory-search');
                    if (searchEl && searchEl.value) {
                        adminApp.filterInventoryTable(searchEl.value);
                    } else {
                        const tbody = document.getElementById('inventory-overview-body');
                        const badge = document.getElementById('inventory-count-badge');
                        if (tbody && badge) badge.textContent = tbody.querySelectorAll('tr').length + ' itens';
                    }
                }, 100);
            };
        }

        // ----- FEATURE 2: Editar Pedido ao Clicar -----

        adminApp.openOrderEditModal = async function(orderId) {
            if (!window.supabase || !orderId) return;

            const { data: record, error } = await window.supabase
                .from('financial_records')
                .select('*')
                .eq('id', orderId)
                .single();

            if (error || !record) {
                Swal.fire('Erro', 'Nao foi possivel carregar o pedido.', 'error');
                return;
            }

            const currentDate = record.due_date
                ? record.due_date.split('T')[0]
                : (record.created_at ? record.created_at.split('T')[0] : '');
            const currentObs = record.notes || record.description || '';
            const currentStatus = record.status || 'pending';

            const { value: formData } = await Swal.fire({
                title: '<span style="font-size:1rem;">\u270f\ufe0f Editar Pedido</span>',
                html: '<div style="text-align:left; padding:4px 0;">'
                    + '<p style="font-size:0.85rem; color:#64748b; margin:0 0 14px 0;">'
                    + '<strong>Cliente:</strong> ' + (record.customer_name || 'N/A') + ' &nbsp;|&nbsp; '
                    + '<strong>Total:</strong> R$ ' + Number(record.total || 0).toFixed(2) + '</p>'
                    + '<label style="font-size:0.78rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px;">Data de Vencimento</label>'
                    + '<input id="swal-due-date" type="date" class="swal2-input" value="' + currentDate + '" style="margin:0 0 14px 0;width:100%;">'
                    + '<label style="font-size:0.78rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px;">Status</label>'
                    + '<select id="swal-order-status" class="swal2-input" style="margin:0 0 14px 0;width:100%;padding:8px;">'
                    + '<option value="pending"' + (currentStatus === 'pending' ? ' selected' : '') + '>\u23f3 Pendente</option>'
                    + '<option value="paid"' + (currentStatus === 'paid' ? ' selected' : '') + '>\u2705 Pago</option>'
                    + '<option value="overdue"' + (currentStatus === 'overdue' ? ' selected' : '') + '>\ud83d\udd34 Vencido</option>'
                    + '<option value="cancelled"' + (currentStatus === 'cancelled' ? ' selected' : '') + '>\u274c Cancelado</option>'
                    + '</select>'
                    + '<label style="font-size:0.78rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px;">Observacao Interna</label>'
                    + '<textarea id="swal-order-notes" class="swal2-textarea" placeholder="Ex: Pagamento combinado para dia 30..." style="margin:0;width:100%;min-height:75px;resize:vertical;">' + currentObs + '</textarea>'
                    + '</div>',
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: '\ud83d\udcbe Salvar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#4f46e5',
                width: 480,
                preConfirm: () => ({
                    due_date: document.getElementById('swal-due-date').value || null,
                    status: document.getElementById('swal-order-status').value,
                    notes: document.getElementById('swal-order-notes').value
                })
            });

            if (!formData) return;

            const { error: updateError } = await window.supabase
                .from('financial_records')
                .update({ due_date: formData.due_date, status: formData.status, notes: formData.notes })
                .eq('id', orderId);

            if (updateError) {
                Swal.fire('Erro', 'Falha ao salvar: ' + updateError.message, 'error');
            } else {
                Swal.fire({ icon: 'success', title: 'Salvo!', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
                adminApp.renderFinancial();
            }
        };

        // ----- FEATURE 4: Gerar Codigo de Produto -----

        adminApp.generateProductCode = async function() {
            const nameInput = document.getElementById('prod-name');
            const codeInput = document.getElementById('prod-sku');
            if (!nameInput || !codeInput) return;

            const name = nameInput.value.trim();
            if (!name) {
                Swal.fire({ icon: 'info', title: 'Nome vazio', text: 'Preencha o nome do produto primeiro.', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
                return;
            }

            const normalize = function(str) {
                return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9\s]/g, '');
            };
            const words = normalize(name).split(/\s+/).filter(function(w) { return w.length > 0; });
            const prefix = words.slice(0, 3).map(function(w) { return w.slice(0, 3); }).join('');
            const seq = String(Date.now()).slice(-4);
            const code = 'MV-' + prefix + '-' + seq;

            codeInput.value = code;
            codeInput.style.transition = 'border-color 0.3s, box-shadow 0.3s';
            codeInput.style.borderColor = '#10b981';
            codeInput.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.2)';
            setTimeout(function() { codeInput.style.borderColor = ''; codeInput.style.boxShadow = ''; }, 2500);

            Swal.fire({ icon: 'success', html: 'Codigo gerado: <strong style="color:#4f46e5;">' + code + '</strong>', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        };

        console.log('Admin Features 1/2/4 injetadas.');
    };

    injectFeatures();

    // ===================================================================
    // FEATURE 3: Produtos por Subcategoria (injeta no CategoryApp)
    // ===================================================================

    const injectCategoryFeature = () => {
        if (typeof CategoryApp === 'undefined') {
            setTimeout(injectCategoryFeature, 500);
            return;
        }

        // Sobrescreve renderSubs para adicionar botao "Ver Produtos"
        CategoryApp.renderSubs = function(parentId) {
            const container = document.getElementById('cat-tree-subs');
            const titleEl = document.getElementById('cat-tree-subs-title');
            const btnAdd = document.getElementById('btn-add-subcat');
            if (!container) return;

            const parent = this.tree.find(function(p) { return p.id === parentId; });
            if (!parent) return;

            titleEl.textContent = 'Filhas de: ' + parent.name;
            btnAdd.style.display = 'inline-flex';

            if (parent.subs.length === 0) {
                container.innerHTML = '<div style="padding:20px; text-align:center; color:#94a3b8; font-style:italic;">Nenhuma subcategoria ainda. Clique em "+ Adicionar Filha" acima.</div>';
                return;
            }

            let html = '';
            parent.subs.forEach(function(sub) {
                const safeId = sub.id;
                const safeName = sub.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                html += '<div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.04);">'
                    + '<div style="display:flex; justify-content:space-between; align-items:center; padding:12px 15px;">'
                    + '<div style="display:flex; align-items:center; gap:12px; color:#475569; font-weight:500;">'
                    + '<i class="ph-duotone ph-git-merge" style="color:#6366f1;"></i> ' + sub.name
                    + '</div>'
                    + '<div style="display:flex; gap:8px; align-items:center;">'
                    + '<button onclick="CategoryApp.toggleSubProducts(\'' + safeId + '\',\'' + safeName + '\')" '
                    + 'id="btn-products-' + safeId + '" '
                    + 'style="background:#f0f9ff; border:1px solid #bae6fd; color:#0369a1; border-radius:6px; padding:4px 10px; font-size:0.78rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:5px;" '
                    + 'onmouseover="this.style.background=\'#e0f2fe\'" onmouseout="this.style.background=\'#f0f9ff\'">'
                    + '<i class="ph-bold ph-package"></i> Ver Produtos'
                    + '</button>'
                    + '<button onclick="CategoryApp.deleteCategory(\'' + safeId + '\')" '
                    + 'style="background:none; border:none; color:#ef4444; cursor:pointer; padding:5px; border-radius:4px;" '
                    + 'onmouseover="this.style.background=\'#fee2e2\'" onmouseout="this.style.background=\'transparent\'" '
                    + 'title="Deletar Subcategoria">'
                    + '<i class="ph-bold ph-trash"></i>'
                    + '</button>'
                    + '</div>'
                    + '</div>'
                    + '<div id="sub-products-' + safeId + '" style="display:none; border-top:1px solid #f1f5f9; background:#f8fafc;"></div>'
                    + '</div>';
            });

            container.innerHTML = html;
        };

        // Nova funcao: expandir/colapsar produtos desta subcategoria
        CategoryApp.toggleSubProducts = async function(subId, subName) {
            const container = document.getElementById('sub-products-' + subId);
            const btn = document.getElementById('btn-products-' + subId);
            if (!container) return;

            if (container.style.display !== 'none') {
                container.style.display = 'none';
                if (btn) btn.innerHTML = '<i class="ph-bold ph-package"></i> Ver Produtos';
                return;
            }

            container.style.display = 'block';
            container.innerHTML = '<div style="padding:16px; text-align:center; color:#94a3b8; font-size:0.85rem;"><i class="ph-duotone ph-spinner-gap ph-spin" style="font-size:1.5rem;"></i></div>';
            if (btn) btn.innerHTML = '<i class="ph-bold ph-caret-up"></i> Fechar';

            try {
                const { data: products, error } = await window.supabase
                    .from('products')
                    .select('id, name, image, price, subcategory')
                    .eq('subcategory', subName)
                    .order('name');

                if (error) throw error;

                if (!products || products.length === 0) {
                    container.innerHTML = '<div style="padding:16px; text-align:center; color:#94a3b8; font-size:0.85rem;">'
                        + '<i class="ph-duotone ph-package" style="font-size:1.4rem; display:block; margin-bottom:6px; opacity:0.5;"></i>'
                        + 'Nenhum produto em <strong>' + subName + '</strong> ainda.</div>';
                    return;
                }

                let prodHtml = '<div style="padding:10px 15px; font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">'
                    + products.length + ' produto' + (products.length !== 1 ? 's' : '') + '</div>';

                products.forEach(function(p) {
                    const img = p.image || 'https://via.placeholder.com/40';
                    const price = p.price ? 'R$ ' + Number(p.price).toFixed(2) : 'Preco variavel';
                    prodHtml += '<div style="display:flex; align-items:center; gap:12px; padding:9px 15px; border-top:1px solid #f1f5f9; background:white; transition:0.15s;" '
                        + 'onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'white\'">'
                        + '<img src="' + img + '" style="width:36px; height:36px; object-fit:cover; border-radius:7px; border:1px solid #e2e8f0; flex-shrink:0;" '
                        + 'onerror="this.src=\'https://via.placeholder.com/36\'">'
                        + '<div style="flex:1; min-width:0;">'
                        + '<div style="font-weight:600; font-size:0.875rem; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + p.name + '</div>'
                        + '<div style="font-size:0.75rem; color:#10b981; font-weight:600;">' + price + '</div>'
                        + '</div>'
                        + '<button onclick="adminApp.switchView(\'products\'); setTimeout(function(){adminApp.editProd(\'' + p.id + '\');},500);" '
                        + 'title="Editar produto" style="background:none; border:none; color:#6366f1; cursor:pointer; padding:4px; border-radius:4px; font-size:1rem;" '
                        + 'onmouseover="this.style.background=\'#f5f3ff\'" onmouseout="this.style.background=\'none\'">'
                        + '<i class="ph-bold ph-pencil-simple"></i>'
                        + '</button>'
                        + '</div>';
                });

                container.innerHTML = prodHtml;

            } catch (err) {
                console.error('toggleSubProducts error:', err);
                container.innerHTML = '<div style="padding:16px; color:#ef4444; font-size:0.85rem; text-align:center;">Erro: ' + err.message + '</div>';
            }
        };

        // Re-renderiza se havia selecao ativa
        if (CategoryApp.selectedParentId) {
            CategoryApp.renderSubs(CategoryApp.selectedParentId);
        }

        console.log('Admin Feature 3 (CategoryApp) injetada.');
    };

    injectCategoryFeature();
});
