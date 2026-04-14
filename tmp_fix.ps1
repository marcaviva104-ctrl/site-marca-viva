$filePath = "admin\js\admin-protocols.js"
$content = Get-Content -Path $filePath -Raw -Encoding UTF8

$content = $content -replace 'if \(item\.description\) extraInfo\.push\(item\.description\);', "if (item.description) extraInfo.push(typeof item.description === 'object' ? JSON.stringify(item.description).replace(/[{}]/g, '') : item.description);"
$content = $content -replace 'if \(item\.notes\) extraInfo\.push\(item\.notes\);', "if (item.notes) extraInfo.push(typeof item.notes === 'object' ? JSON.stringify(item.notes).replace(/[{}]/g, '') : item.notes);"
$content = $content -replace 'if \(item\.observation\) extraInfo\.push\(item\.observation\);', "if (item.observation) extraInfo.push(typeof item.observation === 'object' ? JSON.stringify(item.observation).replace(/[{}]/g, '') : item.observation);"

$content = $content.Replace(
    ".map(([k, v]) => ``${k}: ${v}``)",
    ".map(([k, v]) => ``${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}``)"
)

# Replacing buttons section cleanly using Regex
$regexButtons = '(?s)<div style="margin-top:15px; display:flex; flex-direction:column; gap:8px;">.*?</div>\s*</div>\s*`,'

$newButtons = @"
                    <div style="margin-top:15px; display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                        <button onclick="window.adminApp.selectPaymentAndPrint('`${id}');"
                            style="grid-column: 1 / -1; background:#3b82f6; color:white; border:none; padding:12px; border-radius:8px; font-size:0.95rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                            <i class="ph-bold ph-receipt"></i> Gerar Orçamento Oficial
                        </button>
                        <button onclick="window.adminApp.printProtocol('`${id}');"
                            style="background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:10px; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
                            <i class="ph-bold ph-printer"></i> Imprimir Ordem
                        </button>
                        <button onclick="window.adminApp.toggleNFe('`${id}');"
                            style="background:`${p.wants_nfe !== false ? '#fef2f2' : '#f0fdf4'}; color:`${p.wants_nfe !== false ? '#ef4444' : '#10b981'}; border:1px solid `${p.wants_nfe !== false ? '#ef4444' : '#10b981'}; padding:10px; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:0.2s;" onmouseover="this.style.transform='scale(0.98)'" onmouseout="this.style.transform='scale(1)'">
                            <i class="ph-bold `${p.wants_nfe !== false ? 'ph-scissors' : 'ph-receipt'}"></i>
                            `${p.wants_nfe !== false ? 'Remover NF-e' : 'Add NF-e'}
                        </button>
                    </div>
                </div>
            `,
"@

$content = $content -replace $regexButtons, $newButtons

# Fix the modal native buttons styling which are currently terrible red/blue colors.
$content = $content -replace "confirmButtonText: 'Fechar',\s*cancelButtonText: 'Rejeitar',\s*denyButtonText: 'Aprovar',", "confirmButtonText: 'Fechar', cancelButtonText: 'Recusar', denyButtonText: 'Aprovar Pedido', confirmButtonColor: '#94a3b8', cancelButtonColor: '#ef4444', denyButtonColor: '#10b981',"

[IO.File]::WriteAllText((Get-Item .).FullName + '\' + $filePath, $content, [System.Text.Encoding]::UTF8)
Write-Output "PS Script Done"
