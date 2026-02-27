
// --- PRODUCT CONFIGURATOR (ENTERPRISE) ---
currentConfigRules: [],

    renderVariationBuilder() {
    const container = document.getElementById('configurator-groups-container');
    if (!container) return;

    container.innerHTML = '';

    if (this.currentConfigRules.length === 0) {
        container.innerHTML = `
                <div style="text-align:center; padding:30px; color:#cbd5e1; border:2px dashed #e2e8f0; border-radius:12px;">
                    <i class="ph-duotone ph-sliders" style="font-size:2rem; margin-bottom:10px;"></i>
                    <p>Nenhuma variação configurada.</p>
                </div>`;
        return;
    }

    this.currentConfigRules.forEach((group, groupIndex) => {
        const groupHtml = `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; padding:15px; position:relative;">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:15px;">
                    <div style="display:flex; gap:10px; flex:1;">
                        <div style="flex:1;">
                            <label class="modal-label">Nome da Opção (Ex: Tipo de Capa)</label>
                            <input type="text" class="modal-input" value="${group.name || ''}" 
                                oninput="adminApp.updateConfigField(${groupIndex}, 'name', this.value)" placeholder="Nome">
                        </div>
                        <div style="width:150px;">
                            <label class="modal-label">Tipo</label>
                            <select class="modal-input" onchange="adminApp.updateConfigField(${groupIndex}, 'type', this.value)">
                                <option value="radio" ${group.type === 'radio' ? 'selected' : ''}>Seleção Única (Radio)</option>
                                <option value="select" ${group.type === 'select' ? 'selected' : ''}>Lista Suspensa</option>
                                <option value="checkbox" ${group.type === 'checkbox' ? 'selected' : ''}>Múltipla Escolha</option>
                            </select>
                        </div>
                    </div>
                    <button onclick="adminApp.removeConfigGroup(${groupIndex})" style="color:#ef4444; background:#fef2f2; border:none; width:30px; height:30px; border-radius:6px; cursor:pointer; margin-left:10px;">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                </div>

                <div style="background:#f8fafc; padding:10px; border-radius:8px;">
                    <label class="modal-label" style="font-size:0.8rem; color:#64748b;">VALORES DISPONÍVEIS</label>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${group.options.map((opt, optIndex) => `
                        <div style="display:flex; gap:8px; align-items:center;">
                            <input type="text" class="modal-input" placeholder="Rótulo (Ex: Capa Dura)" value="${opt.label || ''}"
                                oninput="adminApp.updateConfigOptionField(${groupIndex}, ${optIndex}, 'label', this.value)" style="flex:2;">
                            
                            <div style="position:relative; flex:1;">
                                <span style="position:absolute; left:8px; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:0.8rem;">+R$</span>
                                <input type="number" class="modal-input" placeholder="0.00" value="${opt.price_mod || ''}"
                                    oninput="adminApp.updateConfigOptionField(${groupIndex}, ${optIndex}, 'price_mod', this.value)" style="padding-left:35px;">
                            </div>

                            <button onclick="adminApp.removeConfigOption(${groupIndex}, ${optIndex})" style="color:#94a3b8; background:none; border:none; cursor:pointer; padding:5px;">
                                <i class="ph-bold ph-x"></i>
                            </button>
                        </div>
                        `).join('')}
                    </div>
                    <button onclick="adminApp.addConfigOption(${groupIndex})" style="margin-top:10px; font-size:0.8rem; color:var(--primary-hero); background:none; border:none; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:5px;">
                        <i class="ph-bold ph-plus"></i> Adicionar Valor
                    </button>
                </div>
            </div>
            `;
        container.insertAdjacentHTML('beforeend', groupHtml);
    });
},

addConfigGroup() {
    this.currentConfigRules.push({
        id: crypto.randomUUID(),
        name: '',
        type: 'radio',
        options: [{ label: '', price_mod: 0 }]
    });
    this.renderVariationBuilder();
},

removeConfigGroup(index) {
    Swal.fire({
        title: 'Remover Grupo?',
        text: 'Isso apagará todas as opções deste grupo.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Sim, remover'
    }).then((result) => {
        if (result.isConfirmed) {
            this.currentConfigRules.splice(index, 1);
            this.renderVariationBuilder();
        }
    });
},

addConfigOption(groupIndex) {
    this.currentConfigRules[groupIndex].options.push({ label: '', price_mod: 0 });
    this.renderVariationBuilder();
},

removeConfigOption(groupIndex, optIndex) {
    this.currentConfigRules[groupIndex].options.splice(optIndex, 1);
    this.renderVariationBuilder();
},

updateConfigField(groupIndex, field, value) {
    this.currentConfigRules[groupIndex][field] = value;
},

updateConfigOptionField(groupIndex, optIndex, field, value) {
    if (field === 'price_mod') value = parseFloat(value) || 0;
    this.currentConfigRules[groupIndex].options[optIndex][field] = value;
},
