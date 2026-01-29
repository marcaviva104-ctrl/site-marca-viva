
console.log("Admin Test Loaded");
const adminApp = {
    init: function () { console.log("Init"); },
    switchView: function (id) {
        console.log("Switching to " + id);
        alert("Painel Recuperado! Abrindo: " + id);
        document.querySelectorAll('.admin-view').forEach(e => e.style.display = 'none');
        const el = document.getElementById(id) || document.getElementById(id + '-view');
        if (el) el.style.display = 'block';
    }
};
window.adminApp = adminApp;
console.log("AdminApp Exported");
