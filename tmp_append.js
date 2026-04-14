const fs = require('fs');
const filePath = 'c:\\Users\\Leivin Jesus\\OneDrive\\Desktop\\SiteMarcaViva\\admin\\js\\kanban.js';
const appendString = `

// --- Auto-open Modal Feature ---
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const openProtocol = urlParams.get('open');
    if (openProtocol) {
        setTimeout(() => {
            if(window.ProtocolDetailView) window.ProtocolDetailView.open(openProtocol);
        }, 1500); // Wait for board rendering
    }
});
`;
try {
    fs.appendFileSync(filePath, appendString, 'utf8');
    console.log("Success appended.");
} catch(e) {
    console.error(e);
}
