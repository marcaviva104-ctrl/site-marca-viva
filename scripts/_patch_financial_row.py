# One-off: replace financial table row template in admin.js
from pathlib import Path

path = Path(__file__).resolve().parent.parent / "admin" / "js" / "admin.js"
text = path.read_text(encoding="utf-8", errors="replace")

start = text.find("                    const { VIP_THRESHOLD, VIP_ICON, DEBT_ICON } = window.CRM_CONFIG")
end = text.find("                } catch (rowError) {", start)
if end == -1:
    end = text.find("} catch (rowError) {", start)
if start == -1 or end == -1:
    raise SystemExit("markers not found")

new_block = r"""                    const crmCfg = window.CRM_CONFIG || {};
                    const VIP_THRESHOLD = Number(crmCfg.VIP_THRESHOLD) || 1000;
                    const vipIconHtml = (crmCfg.VIP_ICON and String(crmCfg.VIP_ICON).includes('<'))
                        ? crmCfg.VIP_ICON
                        : '<i class="ph-fill ph-crown" style="color:#f59e0b;font-size:1rem;" aria-hidden="true"></i>';
                    const debtIconHtml = (crmCfg.DEBT_ICON && String(crmCfg.DEBT_ICON).includes('<'))
                        ? crmCfg.DEBT_ICON
                        : '<i class="ph-bold ph-warning-circle" style="color:#ef4444;font-size:1rem;" aria-hidden="true"></i>';

                    let crmBadges = '';
                    if (!isExpense && order.customer_name) {
                        const stats = customerStats[order.customer_name] || { spent: 0, debt: 0 };
                        if (stats.spent > VIP_THRESHOLD) {
                            crmBadges += `<span title="Cliente VIP (acima de R$ ${VIP_THRESHOLD})" style="cursor:help; margin-left:4px;">${vipIconHtml}</span>`;
                        }
                        if (stats.debt > 0) {
                            crmBadges += `<span title="Cliente com saldo em aberto" style="cursor:help; margin-left:4px;">${debtIconHtml}</span>`;
                        }
                    }

                    const encId = encodeURIComponent(String(order.id));
                    const dispId = this.escapeChatHtml(String(order.id));
                    const dispName = this.escapeChatHtml(
                        String(order.customer_name || (isExpense ? (order.description || '') : 'Cliente'))
                    );
                    const catLine = order.category
                        ? ` \u2022 ${this.escapeChatHtml(String(order.category))}`
                        : '';

                    html += `
            <tr class="${trClass}" style="cursor:pointer; transition:background 0.2s; ${rowStyle}" data-fin-row="${encId}" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                <td style="font-weight:bold;">${isExpense ? '\uD83D\uDCC9' : (isManual ? '\uD83D\uDCDD' : '#')} ${dispId}</td>
                <td>
                    <div style="font-weight:600;">
                        ${dispName}
                        ${crmBadges}
                    </div>
                    <div style="font-size:0.8rem;color:#64748b;">${new Date(order.date).toLocaleDateString('pt-BR')}${catLine}</div>
                </td>
                <td>${typeBadge}</td>
                <td style="font-weight:700; color:${amountColor};">${amountPrefix}R$ ${total.toFixed(2)}</td>
                <td style="color:#10b981;">R$ ${paid.toFixed(2)}</td>
                <td style="font-weight:700; color:${debt > 0.01 ? '#ef4444' : '#94a3b8'};">R$ ${Math.max(0, debt).toFixed(2)}</td>
                <td data-fin-stop="1">
                    <button type="button" data-fin-act="pay" data-fin-oid="${encId}" data-fin-total="${total}" data-fin-paid="${paid}" class="${btnClass}" style="${btnStyle}" ${btnDisabled}>
                        ${btnLabel} <i class="ph-bold ph-money"></i>
                    </button>
                    ${!isManual && !isExpense ? `
                        <button type="button" data-fin-act="dossier" data-fin-oid="${encId}" style="background:#f1f5f9;border:1px solid #cbd5e1;padding:4px 8px;border-radius:6px;color:#3b82f6;cursor:pointer;margin-left:6px;vertical-align:middle;box-shadow:0 1px 2px rgba(0,0,0,0.05);" title="Editar pedido">
                            <i class="ph-bold ph-pencil-simple" style="font-size:1.1rem;"></i>
                        </button>
                    ` : ''}
                    ${isManual ? `
                        <button type="button" data-fin-act="edit" data-fin-oid="${encId}" style="background:none;border:none;color:#64748b;cursor:pointer;margin-left:5px;" title="Editar"><i class="ph-bold ph-pencil-simple"></i></button>
                        <button type="button" data-fin-act="del" data-fin-oid="${encId}" style="background:none;border:none;color:#94a3b8;cursor:pointer;margin-left:2px;" title="Excluir"><i class="ph-bold ph-trash"></i></button>
                    ` : ''}
                </td>
            </tr>
            `;

"""

path.write_text(text[:start] + new_block + text[end:], encoding="utf-8", newline="\n")
print("patched row block", start, end)
