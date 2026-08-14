const fs = require('fs');
let code = fs.readFileSync('admin/js/admin-protocols.js', 'utf8');

// Fix 1: Object inside extraInfo
code = code.replace(
    /if \(item\.description\) extraInfo\.push\(item\.description\);/g,
    "if (item.description) extraInfo.push(typeof item.description === 'object' ? JSON.stringify(item.description).replace(/[{}]/g, '') : item.description);"
);
code = code.replace(
    /if \(item\.notes\) extraInfo\.push\(item\.notes\);/g,
    "if (item.notes) extraInfo.push(typeof item.notes === 'object' ? JSON.stringify(item.notes).replace(/[{}]/g, '') : item.notes);"
);
code = code.replace(
    /if \(item\.observation\) extraInfo\.push\(item\.observation\);/g,
    "if (item.observation) extraInfo.push(typeof item.observation === 'object' ? JSON.stringify(item.observation).replace(/[{}]/g, '') : item.observation);"
);

// Fix 2: Object inside customization map
code = code.replace(
    /\.map\(\(\[k, v\]\) => `\$\{k\}: \$\{v\}`\)/g,
    ".map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)"
);

// Fix 3: Ugly Buttons Design
const buttonsRegex = /<div style="margin-top:15px; display:flex; flex-direction:column; gap:8px;">[\s\S]*?<\/div>/;
const newButtons = `<div style="margin-top:15px; display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                        <button onclick="window.adminApp.selectPaymentAndPrint('\${id}');"
                            style="grid-column: 1 / -1; background:#3b82f6; color:white; border:none; padding:12px; border-radius:8px; font-size:0.95rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                            <i class="ph-bold ph-receipt"></i> Gerar Orçamento Oficial
                        </button>
                        <button onclick="window.adminApp.printProtocol('\${id}');"
                            style="background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:10px; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
                            <i class="ph-bold ph-printer"></i> Imprimir Ordem
                        </button>
                        <button onclick="window.adminApp.toggleNFe('\${id}');"
                            style="background:\${p.wants_nfe !== false ? '#fef2f2' : '#f0fdf4'}; color:\${p.wants_nfe !== false ? '#ef4444' : '#10b981'}; border:1px solid \${p.wants_nfe !== false ? '#ef4444' : '#10b981'}; padding:10px; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:0.2s;" onmouseover="this.style.transform='scale(0.98)'" onmouseout="this.style.transform='scale(1)'">
                            <i class="ph-bold \${p.wants_nfe !== false ? 'ph-scissors' : 'ph-receipt'}"></i>
                            \${p.wants_nfe !== false ? 'Remover Imposto' : 'Add NF-e'}
                        </button>
                    </div>`;
code = code.replace(buttonsRegex, newButtons);

// Fix 4: Prettify the main header of the modal too (where the buttons fechar/aprovar are)
// In Swal.fire showCancelButton etc.
// They had colors that were strange.
code = code.replace(
    /confirmButtonText: 'Fechar',\s*cancelButtonText: 'Rejeitar',\s*denyButtonText: 'Aprovar',/g,
    `confirmButtonText: 'Fechar', cancelButtonText: 'Recusar', denyButtonText: 'Aprovar Pedido', confirmButtonColor: '#94a3b8', cancelButtonColor: '#ef4444', denyButtonColor: '#10b981',`
);


fs.writeFileSync('admin/js/admin-protocols.js', code, 'utf8');
console.log("Substitution Complete!");
