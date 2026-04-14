$Map = @{
    "$([char]0xC3)$([char]0xA1)" = "$([char]0xE1)"; # á
    "$([char]0xC3)$([char]0xA2)" = "$([char]0xE2)"; # â
    "$([char]0xC3)$([char]0xA3)" = "$([char]0xE3)"; # ã
    "$([char]0xC3)$([char]0xA7)" = "$([char]0xE7)"; # ç
    "$([char]0xC3)$([char]0xA9)" = "$([char]0xE9)"; # é
    "$([char]0xC3)$([char]0xAA)" = "$([char]0xEA)"; # ê
    "$([char]0xC3)$([char]0xAD)" = "$([char]0xED)"; # í (0xAD)
    "$([char]0xC3)$([char]0xB3)" = "$([char]0xF3)"; # ó
    "$([char]0xC3)$([char]0xB4)" = "$([char]0xF4)"; # ô
    "$([char]0xC3)$([char]0xB5)" = "$([char]0xF5)"; # õ
    "$([char]0xC3)$([char]0xBA)" = "$([char]0xFA)"; # ú
    "$([char]0xC3)$([char]0x87)" = "$([char]0xC7)"; # Ç
    "$([char]0xC3)$([char]0x89)" = "$([char]0xC9)"; # É
    "$([char]0xC3)$([char]0x83)" = "$([char]0xC3)"; # Ã
    "$([char]0xC3)$([char]0x95)" = "$([char]0xD5)"; # Õ
    "$([char]0xC3)$([char]0x93)" = "$([char]0xD3)"; # Ó
    "$([char]0xC3)$([char]0x94)" = "$([char]0xD4)"; # Ô
    "$([char]0xC3)$([char]0x8A)" = "$([char]0xCA)"; # Ê
    "$([char]0xC3)$([char]0x82)" = "$([char]0xC2)"; # Â
    "$([char]0xC3)$([char]0x80)" = "$([char]0xC0)"; # À
    "$([char]0xC3)$([char]0xA0)" = "$([char]0xE0)"; # à
    "$([char]0xC3)$([char]0xBC)" = "$([char]0xFC)"; # ü
}

$dirs = @('pages', 'scripts', 'admin', 'styles')
$utf8NoBom = New-Object System.Text.UTF8Encoding $False

$totalFixed = 0

foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        Write-Host "Scanning $dir..."
        $files = Get-ChildItem -Path $dir -Recurse -File | Where-Object { $_.Extension -match '\.(html|js|css|md)$' }
        foreach ($file in $files) {
            $path = $file.FullName
            try {
                $content = [System.IO.File]::ReadAllText($path)
                $newContent = $content
                
                foreach ($key in $Map.Keys) {
                    $val = $Map[$key]
                    $newContent = $newContent.Replace($key, $val)
                }

                if ($content -cne $newContent) {
                    [System.IO.File]::WriteAllText($path, $newContent, $utf8NoBom)
                    Write-Host "[FIXED] $path"
                    $totalFixed++
                }
            } catch {
                Write-Host "[ERROR] $path - $_"
            }
        }
    }
}

Write-Host "`nDONE! Total files fixed: $totalFixed"
