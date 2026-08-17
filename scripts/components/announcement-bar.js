// Barra de aviso no topo do site — lida em Site Content -> Barra de Aviso.
// Extraída do que já rodava só em pages/index.html (script inline
// applyDynamicContent) para poder ser incluída em todas as páginas
// públicas, já que o texto no admin promete "aparece para todos os
// visitantes".
(async function renderAnnouncementBar() {
    if (typeof SettingsService === 'undefined') return;

    let settings = {};
    try { settings = await SettingsService.getGlobalSettings() || {}; } catch (e) { return; }

    const ab = settings.announcementBar;
    if (!ab || !ab.enabled || !ab.text) return;

    const bar = document.createElement('div');
    bar.id = 'announcement-bar';
    bar.style.cssText = `background:${ab.bgColor || '#ea580c'};color:white;text-align:center;padding:10px 20px;font-weight:600;font-size:0.9rem;position:relative;z-index:200;`;
    bar.innerHTML = `<span>${ab.text}</span><button onclick="this.parentElement.remove()" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);background:none;border:none;color:white;font-size:1.2rem;cursor:pointer;opacity:0.8;">&times;</button>`;
    document.body.prepend(bar);
})();
