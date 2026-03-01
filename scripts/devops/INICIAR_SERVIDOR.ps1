# Script para iniciar servidor local
Write-Host "🚀 Iniciando servidor local..." -ForegroundColor Cyan
Write-Host ""

# Tentar Python primeiro
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python") {
        Write-Host "✅ Python encontrado: $pythonVersion" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 Servidor rodando em:" -ForegroundColor Yellow
        Write-Host "   http://localhost:8000" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📄 Acesse:" -ForegroundColor Yellow
        Write-Host "   Homepage: http://localhost:8000/index.html" -ForegroundColor White
        Write-Host "   Admin:    http://localhost:8000/admin.html" -ForegroundColor White
        Write-Host ""
        Write-Host "⚠️  Pressione CTRL+C para parar o servidor" -ForegroundColor Red
        Write-Host ""
        
        python -m http.server 8000
    }
}
catch {
    Write-Host "❌ Python não encontrado" -ForegroundColor Red
    Write-Host ""
    Write-Host "📥 Instale Python:" -ForegroundColor Yellow
    Write-Host "   https://www.python.org/downloads/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ou use Live Server no VSCode!" -ForegroundColor Green
    pause
}
