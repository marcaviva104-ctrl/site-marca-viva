
$path = "scripts/pages/admin.js"
$content = Get-Content $path -Raw -Encoding UTF8

# 1. Append Global Export if not exists
if (-not ($content -match "window.adminApp = adminApp;")) {
    Add-Content -Path $path -Value "`n// Explicit Global Export`nwindow.adminApp = adminApp;"
}

# 2. Add SafeStorage to loadTheme
$content = Get-Content $path -Raw -Encoding UTF8
$safeThemeBlock = @"
    loadTheme() {
        try {
            const savedTheme = window.SafeStorage ? window.SafeStorage.getItem('mv_theme') : localStorage.getItem('mv_theme');
            if (savedTheme === 'dark') {
                document.body.classList.add('dark-mode');
            }
        } catch (e) { console.warn("Theme Load Error (SafeStorage)"); }
        this.injectThemeToggle();
    },
"@

$content = $content -replace "loadTheme\(\) \{(\r?\n|\s)*try \{(\r?\n|\s)*const savedTheme = localStorage\.getItem\('mv_theme'\);[\s\S]*?catch \(e\) \{ console\.warn\(""LocalStorage blocked \(Theme\)""\); \}(\r?\n|\s)*this\.injectThemeToggle\(\);(\r?\n|\s)*\},", $safeThemeBlock

# 3. Fix bindNav and switchView (The big fix)
# We search for the old pattern where switchView is dynamically defined inside bindNav
# And replace with the clean static version.

$oldPattern = @"
    bindNav\(\) \{[\s\S]*?this\.switchView = \(vid, link\) => \{[\s\S]*?\}
    \},
"@

# Note: The replacement text needs to be exact syntax.
$newBlock = @"
    bindNav() {
        document.querySelectorAll('.nav-item').forEach(link => {
            link.addEventListener('click', (e) => {
                const vid = link.getAttribute('data-view');
                if (!vid) return;
                e.preventDefault();
                this.switchView(vid, link);
            });
        });
        console.log("AdminApp: Navigation Bound.");
    },

    switchView(vid, link) {
        if (link) {
            document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        } else {
             const l = document.querySelector('.nav-item[data-view="' + vid + '"]');
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

        try {
            if (vid === 'inputs') this.renderInputsTable();
            if (vid === 'products') this.renderProductsTable();
            if (vid === 'dashboard') this.renderDashboard();
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

# Simple string replace if Regex is too hard, but Regex handles whitespace better.
# Because whitespace varies, I'll try to just overwrite the file using a known valid block location if regex fails.
# Actually, since I know the content of the file from step 353 (Get-Content), I can match loosely.

# Let's try to overwrite the file with the replacement? No, too risky.
# Let's use the regex.

$content = [System.Text.RegularExpressions.Regex]::Replace($content, "bindNav\(\)\s*\{[\s\S]*?this\.switchView\s*=\s*\(vid, link\)\s*=>\s*\{[\s\S]*?\}\s*\},", $newBlock)

Set-Content -Path $path -Value $content -Encoding UTF8
Write-Host "Admin.js patched successfully."
