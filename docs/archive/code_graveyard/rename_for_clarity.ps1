$RENAMES = @{
    "scripts/services/app.js"           = "scripts/services/shop-ui-controller.js"
    "scripts/services/verify_status.js" = "scripts/utils/debug-user-status.js"
    "styles/components/qty-fix.css"     = "styles/components/quantity-selector.css"
    "styles/base/dynamic.css"           = "styles/base/interactions.css"
    "scripts/services/crm.js"           = "scripts/services/crm-client.js"
}

$Root = Get-Location

# 1. Update References
Write-Host "Updating references..."
$Files = Get-ChildItem -Path $Root -Recurse -Include *.html, *.css, *.js -Exclude ".git", "node_modules", "archive"

foreach ($File in $Files) {
    $Content = Get-Content -Path $File.FullName -Raw
    $Modified = $false

    foreach ($Old in $RENAMES.Keys) {
        $New = $RENAMES[$Old]
        
        # Replace occurrences of the filename
        # We check both full path and just filename
        $OldName = Split-Path $Old -Leaf
        $NewName = Split-Path $New -Leaf
        
        if ($Content -like "*$OldName*") {
            $Content = $Content -replace [regex]::Escape($Old), $New
            $Content = $Content -replace [regex]::Escape($OldName), $NewName
            $Modified = $true
        }
    }

    if ($Modified) {
        Write-Host "Updating $($File.Name)"
        Set-Content -Path $File.FullName -Value $Content -NoNewline
    }
}

# 2. Rename Files
Write-Host "Renaming files..."
foreach ($Old in $RENAMES.Keys) {
    $OldPath = Join-Path $Root $Old
    $NewPath = Join-Path $Root $RENAMES[$Old]
    
    if (Test-Path $OldPath) {
        Write-Host "Renaming $Old -> $($RENAMES[$Old])"
        Move-Item -Path $OldPath -Destination $NewPath -Force
    }
    else {
        Write-Host "Skipping missing: $Old"
    }
}
