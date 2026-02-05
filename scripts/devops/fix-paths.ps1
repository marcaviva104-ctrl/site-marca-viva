# Script para corrigir caminhos de scripts nas páginas movidas

$pagesDir = "c:\Users\Leivin Jesus\OneDrive\Desktop\SiteMarcaViva\pages"
$htmlFiles = Get-ChildItem -Path $pagesDir -Filter "*.html"

Write-Host "🔧 Corrigindo caminhos dos scripts..." -ForegroundColor Cyan

foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    # Corrigir todos os caminhos relativos
    $content = $content -replace 'src="scripts/', 'src="../scripts/'
    $content = $content -replace 'href="styles/', 'href="../styles/'
    $content = $content -replace 'href="index.html"', 'href="../index.html"'
    $content = $content -replace 'href="admin.html"', 'href="../admin.html"'
    
    # Salvar arquivo
    [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
    
    Write-Host "✅ Corrigido: $($file.Name)" -ForegroundColor Green
}

Write-Host "`n✨ Todos os caminhos foram corrigidos!" -ForegroundColor Green
Write-Host "📝 Total de arquivos: $($htmlFiles.Count)" -ForegroundColor Yellow
