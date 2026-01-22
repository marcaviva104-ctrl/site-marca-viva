$SUPABASE_URL = "https://qnudbyhnqtsxlqwgkmal.supabase.co"
$SUPABASE_KEY = "sb_publishable_AMo1o9yvNV-p_qSE2j5Ztw_7CM1oYeL"

$Headers = @{
    "apikey" = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

Write-Host "🔍 INICIANDO VERIFICACAO VIA POWERSHELL..." -ForegroundColor Cyan
Write-Host "----------------------------------------"

# 1. TESTE DE PRODUTOS (Public Read)
Write-Host "1. Testando Leitura de Produtos (Publico)..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/products?select=id&limit=1" -Method Get -Headers $Headers -ErrorAction Stop
    Write-Host " [OK] Sucesso!" -ForegroundColor Green
} catch {
    Write-Host " [FALHA]" -ForegroundColor Red
    Write-Host "   Erro: $($_.Exception.Message)"
}

# 2. TESTE DE CATEGORIAS (Public Read)
Write-Host "2. Testando Leitura de Categorias..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/categories?select=id&limit=1" -Method Get -Headers $Headers -ErrorAction Stop
    Write-Host " [OK] Sucesso!" -ForegroundColor Green
} catch {
    Write-Host " [FALHA]" -ForegroundColor Red
    Write-Host "   Erro: $($_.Exception.Message)"
}

# 3. TESTE DE GUEST CHECKOUT (Insert Order)
Write-Host "3. Simulando Pedido Guest..." -NoNewline
$OrderData = @{
    total_amount = 5.00
    status = "pending"
    payment_method = "test_verify_ps1"
    shipping_address = "Teste PowerShell"
    customer_name = "Verifier Bot"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/orders" -Method Post -Headers $Headers -Body $OrderData -ErrorAction Stop
    Write-Host " [OK] Sucesso!" -ForegroundColor Green
    Write-Host "   Pedido criado. O banco aceitou insert sem login." -ForegroundColor Gray
} catch {
    Write-Host " [FALHA]" -ForegroundColor Red
    Write-Host "   Erro: $($_.Exception.Message)"
    Write-Host "   O banco recusou o pedido. O script SQL nao deve ter rodado corretamente."
}

Write-Host "----------------------------------------"
Write-Host "Fim da verificacao."
