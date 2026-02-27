# Script para corrigir TODAS as referências a tabelas financeiras inexistentes

$filePath = "c:\Users\Leivin Jesus\OneDrive\Desktop\SiteMarcaViva\scripts\pages\admin.js"

Write-Host "🔧 Corrigindo referências a tabelas financeiras..." -ForegroundColor Cyan

# Ler conteúdo
$content = Get-Content $filePath -Raw -Encoding UTF8

# Contar antes
$countBefore = ([regex]::Matches($content, "financial_records")).Count
Write-Host "📊 Encontradas $countBefore referências a 'financial_records'" -ForegroundColor Yellow

# Substituir TODAS as ocorrências
$content = $content -replace "from\('financial_records'\)", "from('protocols')"
$content = $content -replace "from\(`"financial_records`"\)", "from('protocols')"

# Salvar
[System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)

# Contar depois
$contentAfter = Get-Content $filePath -Raw -Encoding UTF8
$countAfter = ([regex]::Matches($contentAfter, "financial_records")).Count

Write-Host "✅ Substituídas: $($countBefore - $countAfter) ocorrências" -ForegroundColor Green
Write-Host "⚠️  Restantes: $countAfter (podem ser comentários ou strings)" -ForegroundColor Yellow

Write-Host "`n✨ Correção concluída!" -ForegroundColor Green
Write-Host "📝 Arquivo: admin.js" -ForegroundColor Cyan
