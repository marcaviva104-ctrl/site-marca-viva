# PowerShell Script: Integrate Users Panel into Admin
# This script automatically adds Users management section to admin.html and admin.js

Write-Host "🚀 Starting Users Panel Integration..." -ForegroundColor Cyan

$basePath = "c:\Users\Leivin Jesus\OneDrive\Desktop\SiteMarcaViva"
$adminHtmlPath = "$basePath\admin.html"
$adminJsPath = "$basePath\scripts\admin.js"
$usersHtmlPath = "$basePath\users_section.html"
$usersFunctionsPath = "$basePath\users_functions.js"

# Create backups
Write-Host "📦 Creating backups..." -ForegroundColor Yellow
Copy-Item $adminHtmlPath "$adminHtmlPath.backup" -Force
Copy-Item $adminJsPath "$adminJsPath.backup" -Force
Write-Host "✅ Backups created" -ForegroundColor Green

# === STEP 1: Add Sidebar Item ===
Write-Host "`n📌 Step 1: Adding sidebar navigation item..." -ForegroundColor Cyan

$htmlContent = Get-Content $adminHtmlPath -Raw -Encoding UTF8

$sidebarItem = @"
                <a href="#" class="nav-item" data-view="users" onclick="adminApp.switchView('users', this)">
                    <i class="ph-duotone ph-users-three"></i> Usuários
                </a>
"@

# Find the Financeiro nav item and add after it
$pattern = '(<a href="#" class="nav-item" data-view="financial"[^>]*>[\s\S]*?</a>)'
if ($htmlContent -match $pattern) {
    $financialNav = $matches[1]
    $htmlContent = $htmlContent -replace [regex]::Escape($financialNav), "$financialNav`n$sidebarItem"
    Write-Host "✅ Sidebar item added" -ForegroundColor Green
} else {
    Write-Host "⚠️ Could not find Financeiro nav item" -ForegroundColor Yellow
}

# === STEP 2: Add Users Section HTML ===
Write-Host "`n📄 Step 2: Adding Users section HTML..." -ForegroundColor Cyan

$usersHtml = Get-Content $usersHtmlPath -Raw -Encoding UTF8
$usersHtml = $usersHtml -replace '<!--[^>]*-->', ''  # Remove comments
$usersHtml = $usersHtml.Trim()

# Find Settings section and insert after it
$settingsPattern = '(<!-- Settings.*?</div>\s*</div>)'
if ($htmlContent -match $settingsPattern) {
    $settingsSection = $matches[1]
    $htmlContent = $htmlContent -replace [regex]::Escape($settingsSection), "$settingsSection`n`n        $usersHtml"
    Write-Host "✅ Users section HTML added" -ForegroundColor Green
} else {
    Write-Host "⚠️ Could not find Settings section" -ForegroundColor Yellow
}

# Save admin.html
$htmlContent | Set-Content $adminHtmlPath -Encoding UTF8 -NoNewline
Write-Host "💾 admin.html saved" -ForegroundColor Green

# === STEP 3: Add JavaScript Functions ===
Write-Host "`n⚙️ Step 3: Adding JavaScript functions..." -ForegroundColor Cyan

$jsContent = Get-Content $adminJsPath -Raw -Encoding UTF8
$usersFunctions = Get-Content $usersFunctionsPath -Raw -Encoding UTF8

# Remove comments from functions
$usersFunctions = $usersFunctions -replace '^//.*\n', ''
$usersFunctions = $usersFunctions.Trim()

# Find the last function before closing brace of adminApp
$insertionPattern = '(\s+async markNotificationAsRead\(id\)[^\}]*\})'
if ($jsContent -match $insertionPattern) {
    $lastFunction = $matches[1]
    $jsContent = $jsContent -replace [regex]::Escape($lastFunction), "$lastFunction,`n`n    $usersFunctions"
    Write-Host "✅ JavaScript functions added" -ForegroundColor Green
} else {
    Write-Host "⚠️ Could not find insertion point in admin.js" -ForegroundColor Yellow
}

# Save admin.js
$jsContent | Set-Content $adminJsPath -Encoding UTF8 -NoNewline
Write-Host "💾 admin.js saved" -ForegroundColor Green

# === STEP 4: Update switchView function ===
Write-Host "`n🔧 Step 4: Updating switchView function..." -ForegroundColor Cyan

$jsContent = Get-Content $adminJsPath -Raw -Encoding UTF8

# Find switchView and add users case
$switchViewPattern = "(case 'financial':[\s\S]*?break;)"
if ($jsContent -match $switchViewPattern) {
    $financialCase = $matches[1]
    $usersCase = @"

        case 'users':
            this.fetchUsers();
            break;
"@
    $jsContent = $jsContent -replace [regex]::Escape($financialCase), "$financialCase$usersCase"
    Write-Host "✅ switchView updated" -ForegroundColor Green
} else {
    Write-Host "⚠️ Could not find switchView function" -ForegroundColor Yellow
}

# Save again
$jsContent | Set-Content $adminJsPath -Encoding UTF8 -NoNewline

Write-Host "`n✨ Integration Complete!" -ForegroundColor Green
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "  ✅ Sidebar item added" -ForegroundColor White
Write-Host "  ✅ Users section HTML added" -ForegroundColor White
Write-Host "  ✅ JavaScript functions added" -ForegroundColor White
Write-Host "  ✅ switchView function updated" -ForegroundColor White
Write-Host "`n💡 Refresh your admin panel to see the new 'Usuários' tab!" -ForegroundColor Yellow
Write-Host "🔙 Backups saved with .backup extension" -ForegroundColor Gray
