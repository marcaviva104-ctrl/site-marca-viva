$MOVES = @{
    # --- SCRIPTS ---
    # Pages
    "scripts/admin.js"               = "scripts/pages/"
    "scripts/checkout.js"            = "scripts/pages/"
    "scripts/product.js"             = "scripts/pages/"
    "scripts/produto.js"             = "scripts/pages/"
    "scripts/profile.js"             = "scripts/pages/"
    "scripts/orders.js"              = "scripts/pages/"
    "scripts/confirmacao.js"         = "scripts/pages/"
    "scripts/favoritos.js"           = "scripts/pages/"
    "scripts/settings.js"            = "scripts/pages/"
    "scripts/stories.js"             = "scripts/pages/"
    "scripts/stories-admin.js"       = "scripts/pages/"
    "scripts/create-test-client.js"  = "scripts/pages/"
    "scripts/login.js"               = "scripts/pages/"
    "scripts/produto-reviews.js"     = "scripts/pages/"

    # Components
    "scripts/cart.js"                = "scripts/components/"
    "scripts/cookies-banner.js"      = "scripts/components/"
    "scripts/ui-auth.js"             = "scripts/components/"
    "scripts/chat.js"                = "scripts/components/"

    # Services
    "scripts/auth.js"                = "scripts/services/"
    "scripts/checkout-service.js"    = "scripts/services/"
    "scripts/coupon-service.js"      = "scripts/services/"
    "scripts/favorites-service.js"   = "scripts/services/"
    "scripts/newsletter-service.js"  = "scripts/services/"
    "scripts/products.js"            = "scripts/services/"
    "scripts/realtime.js"            = "scripts/services/"
    "scripts/shipping-service.js"    = "scripts/services/"
    "scripts/crm.js"                 = "scripts/services/"
    "scripts/verify_status.js"       = "scripts/services/"
    "scripts/app.js"                 = "scripts/services/"

    # Config
    "scripts/config.js"              = "scripts/config/"
    "scripts/whatsapp-config.js"     = "scripts/config/"

    # Utils
    "scripts/diagnose.js"            = "scripts/utils/"
    "scripts/storage.js"             = "scripts/utils/"

    # --- STYLES ---
    # Base
    "styles/global.css"              = "styles/base/"
    "styles/design-system.css"       = "styles/base/"
    "styles/mobile-optimization.css" = "styles/base/"
    "styles/dynamic.css"             = "styles/base/"
    "styles/elo7-override.css"       = "styles/base/"

    # Pages
    "styles/admin.css"               = "styles/pages/"
    "styles/checkout.css"            = "styles/pages/"
    "styles/confirmacao.css"         = "styles/pages/"
    "styles/favoritos.css"           = "styles/pages/"
    "styles/landing.css"             = "styles/pages/"
    "styles/produto.css"             = "styles/pages/"
    "styles/shop.css"                = "styles/pages/"
    "styles/stories.css"             = "styles/pages/"
    "styles/profile-bento.css"       = "styles/pages/"
    "styles/personalization.css"     = "styles/pages/"

    # Components
    "styles/auth-modal.css"          = "styles/components/"
    "styles/auth.css"                = "styles/components/"
    "styles/cart-sidebar.css"        = "styles/components/"
    "styles/cart-ui.css"             = "styles/components/"
    "styles/cookies-banner.css"      = "styles/components/"
    "styles/lightbox.css"            = "styles/components/"
    "styles/premium-components.css"  = "styles/components/"
    "styles/search.css"              = "styles/components/"
    "styles/whatsapp-button.css"     = "styles/components/"
    "styles/qty-fix.css"             = "styles/components/"
    "styles/account-menu.css"        = "styles/components/"
}

$Root = Get-Location

# 1. Update References
Write-Host "Scanning files to update references..."
$Files = Get-ChildItem -Path $Root -Recurse -Include *.html, *.css, *.js -Exclude ".git", "node_modules", "archive", "*.backup"

foreach ($File in $Files) {
    if ($File.FullName -like "*\docs\archive\*") { continue }
    
    $Content = Get-Content -Path $File.FullName -Raw
    $OriginalContent = $Content
    $Modified = $false

    foreach ($Key in $MOVES.Keys) {
        $OldPath = $Key # e.g. "scripts/admin.js"
        $DestDir = $MOVES[$Key] # e.g. "scripts/pages/"
        $Filename = Split-Path $OldPath -Leaf
        $NewPath = Join-Path $DestDir $Filename # e.g. "scripts/pages/admin.js"
        $NewPath = $NewPath -replace "\\", "/"
        
        # Replace simple occurrences
        if ($Content -like "*$OldPath*") {
            $Content = $Content -replace [regex]::Escape($OldPath), $NewPath
            $Modified = $true
        }
    }

    if ($Modified) {
        Write-Host "Updating $($File.Name)"
        Set-Content -Path $File.FullName -Value $Content -NoNewline
    }
}

# 2. Move Files
Write-Host "Moving files..."
foreach ($Key in $MOVES.Keys) {
    $OldPath = Join-Path $Root $Key
    $DestDirRelative = $MOVES[$Key]
    $DestDir = Join-Path $Root $DestDirRelative
    
    if (Test-Path $OldPath) {
        if (-not (Test-Path $DestDir)) {
            New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
        }
        $FileName = Split-Path $OldPath -Leaf
        $NewFilePath = Join-Path $DestDir $FileName
        
        Write-Host "Moving $FileName to $DestDirRelative"
        Move-Item -Path $OldPath -Destination $NewFilePath -Force
    }
}

Write-Host "Refactor Complete."
