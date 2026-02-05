
# 1. Define Paths
$src = "scripts/pages/admin.js"
$dest = "scripts/pages/admin_final.js"

# 2. Read Content (Force UTF8)
$content = [System.IO.File]::ReadAllText($src, [System.Text.Encoding]::UTF8)

# 3. Define the Fix Block (Static switchView)
$cleanBindNav = @"
    bindNav() {
        document.querySelectorAll('.nav-item').forEach(link => {
            link.addEventListener('click', (e) => {
                const vid = link.getAttribute('data-view');
                if (!vid) return;
                e.preventDefault();
                // Logic extracted to switchView to be reusable
                this.switchView(vid, link);
            });
        });
        console.log("AdminApp: Navigation Bound.");
    },

    switchView(vid, link) {
        // UI Navigation Logic
        if (link) {
            document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        } else {
             // Find link if not provided
             const l = document.querySelector('.nav-item[data-view=\"' + vid + '\"]');
             if (l) {
                 document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                 l.classList.add('active');
             }
        }

        document.querySelectorAll('.admin-view, .view-section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.admin-view, .view-section').forEach(s => s.style.display = 'none');

        const view = document.getElementById(vid) || document.getElementById(vid + '-view');
        if (view) {
            view.classList.add('active');
            view.style.display = 'block';
        }

        // Lazy Loads
        try {
            if (vid === 'inputs') this.renderInputsTable();
            if (vid === 'products') this.renderProductsTable();
            if (vid === 'dashboard') this.switchView('financial'); // Redirect Dashboard to Financial
            if (vid === 'inventory') this.renderInventoryView();
            if (vid === 'orders') this.renderOrdersTable();
            if (vid === 'messages') this.renderMessagesView();
            if (vid === 'financial') this.renderFinancial();
            if (vid === 'settings') this.loadSettings();
            if (vid === 'customers') CRMManager.loadCustomers();
            if (vid === 'users') this.fetchUsers();
            if (vid === 'protocols' && typeof ProtocolsManager !== 'undefined') ProtocolsManager.loadProtocols();
        } catch(e) {
            console.error("View Switch Error:", e);
        }
    },
"@

# 4. Regex Replace (Loose match to catch the old bindNav)
# Pattern matches "bindNav() { ... this.switchView = ... }"
$pattern = "bindNav\(\)\s*\{[\s\S]*?this\.switchView\s*=\s*\(vid, link\)\s*=>\s*\{[\s\S]*?\}\s*\},"
$content = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern, $cleanBindNav)

# 5. Append Export
if (-not ($content -match "window.adminApp = adminApp;")) {
    $content += "`n`n// Explicit Global Export`nwindow.adminApp = adminApp;"
}

# 6. Write to New File (Force UTF8)
[System.IO.File]::WriteAllText($dest, $content, [System.Text.Encoding]::UTF8)

Write-Host "Admin Final Generated Successfully."
