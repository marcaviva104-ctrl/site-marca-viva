# Servidor local estatico para o site Marca Viva.
#
# IMPORTANTE: este arquivo e escrito somente em ASCII (sem acentos e sem tracos longos).
# O PowerShell do Windows le arquivos .ps1 como ANSI. Se alguem salvar acentos aqui em
# UTF-8, os caracteres viram lixo (ex.: um traco longo vira aspas) e o script para de
# funcionar com erros de "chave de fechamento ausente". Mantenha tudo em ASCII.
#
# Como usar:
#   - De um duplo clique em ABRIR-SITE.bat
#   - Ou clique com o botao direito neste arquivo e escolha "Executar com PowerShell"
#
# Depois abra no navegador: http://127.0.0.1:8787/pages/index.html

$Port = 8787
$Root = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$HomeUrl = "http://127.0.0.1:$Port/pages/index.html"

function Find-Python {
    foreach ($name in @('py', 'python', 'python3')) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue
        if ($cmd) { return $name }
    }
    return $null
}

function Test-PortBusy([int]$p) {
    try {
        $c = New-Object System.Net.Sockets.TcpClient
        $c.Connect('127.0.0.1', $p)
        $c.Close()
        return $true
    } catch {
        return $false
    }
}

Write-Host ""
Write-Host "=== Marca Viva - servidor local ===" -ForegroundColor Cyan
Write-Host ""

if (Test-PortBusy $Port) {
    Write-Host "A porta $Port ja esta em uso." -ForegroundColor Yellow
    Write-Host "Provavelmente o servidor ja esta rodando em outra janela." -ForegroundColor Gray
    Write-Host "Abra direto no navegador: $HomeUrl" -ForegroundColor Green
    Write-Host ""
    Start-Process $HomeUrl
    Read-Host "Pressione Enter para fechar esta janela"
    exit 0
}

# --- Opcao 1: usar Python, se estiver instalado (mais simples e estavel) ---
$py = Find-Python
if ($py) {
    Write-Host "Servidor iniciando com Python ($py -m http.server)" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Abra no navegador:  $HomeUrl" -ForegroundColor Cyan
    Write-Host "  Painel admin:       http://127.0.0.1:$Port/admin/admin.html" -ForegroundColor Cyan
    Write-Host "  Para parar:         aperte Ctrl + C" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "NAO FECHE esta janela enquanto estiver usando o site." -ForegroundColor Yellow
    Write-Host ""
    Set-Location $Root
    Start-Process $HomeUrl
    & $py -m http.server $Port
    exit 0
}

# --- Opcao 2: servidor proprio em PowerShell (quando nao ha Python) ---
Write-Host "Python nao encontrado. Usando o servidor interno do PowerShell." -ForegroundColor Gray
Write-Host ""

Add-Type -AssemblyName System.Web

function Get-Mime([string]$ext) {
    switch ($ext.ToLowerInvariant()) {
        '.html'  { 'text/html; charset=utf-8' }
        '.htm'   { 'text/html; charset=utf-8' }
        '.css'   { 'text/css; charset=utf-8' }
        '.js'    { 'application/javascript; charset=utf-8' }
        '.mjs'   { 'application/javascript; charset=utf-8' }
        '.json'  { 'application/json; charset=utf-8' }
        '.svg'   { 'image/svg+xml' }
        '.png'   { 'image/png' }
        '.jpg'   { 'image/jpeg' }
        '.jpeg'  { 'image/jpeg' }
        '.gif'   { 'image/gif' }
        '.webp'  { 'image/webp' }
        '.avif'  { 'image/avif' }
        '.ico'   { 'image/x-icon' }
        '.woff'  { 'font/woff' }
        '.woff2' { 'font/woff2' }
        '.ttf'   { 'font/ttf' }
        '.pdf'   { 'application/pdf' }
        '.txt'   { 'text/plain; charset=utf-8' }
        '.xml'   { 'application/xml; charset=utf-8' }
        default  { 'application/octet-stream' }
    }
}

$prefix = "http://127.0.0.1:$Port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "Nao foi possivel iniciar o servidor na porta $Port." -ForegroundColor Red
    Write-Host "Causas comuns:" -ForegroundColor Gray
    Write-Host "  - a porta ja esta em uso por outro programa" -ForegroundColor Gray
    Write-Host "  - o Windows bloqueou esta URL por permissao" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Solucao mais facil: instale o Python em https://python.org/downloads" -ForegroundColor Yellow
    Write-Host "(marque a caixa 'Add Python to PATH' na instalacao) e rode este arquivo de novo." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Pressione Enter para fechar"
    exit 1
}

Write-Host "Servidor no ar." -ForegroundColor Green
Write-Host ""
Write-Host "  Abra no navegador:  $HomeUrl" -ForegroundColor Cyan
Write-Host "  Painel admin:       http://127.0.0.1:$Port/admin/admin.html" -ForegroundColor Cyan
Write-Host "  Pasta servida:      $Root" -ForegroundColor Gray
Write-Host "  Para parar:         aperte Ctrl + C" -ForegroundColor Yellow
Write-Host ""
Write-Host "NAO FECHE esta janela enquanto estiver usando o site." -ForegroundColor Yellow
Write-Host ""

Start-Process $HomeUrl

$rootGuard = $Root
if (-not $rootGuard.EndsWith([IO.Path]::DirectorySeparatorChar)) {
    $rootGuard = $rootGuard + [IO.Path]::DirectorySeparatorChar
}

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $res = $ctx.Response
        try {
            $path = [System.Web.HttpUtility]::UrlDecode($req.Url.AbsolutePath.TrimStart('/'))

            if ($path -eq '' -or $path -eq '/') {
                $res.Redirect($HomeUrl)
                $res.Close()
                continue
            }

            $relative = $path.Replace('/', [IO.Path]::DirectorySeparatorChar)
            $full = [System.IO.Path]::GetFullPath((Join-Path $Root $relative))

            $inside = ($full -eq $Root) -or $full.StartsWith($rootGuard, [StringComparison]::OrdinalIgnoreCase)

            if (-not $inside) {
                $res.StatusCode = 403
                $buf = [Text.Encoding]::UTF8.GetBytes('403 Forbidden')
                $res.OutputStream.Write($buf, 0, $buf.Length)
            }
            elseif (Test-Path $full -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($full)
                $res.ContentType = Get-Mime ([IO.Path]::GetExtension($full))
                $res.ContentLength64 = $bytes.LongLength
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            else {
                $res.StatusCode = 404
                $msg = "404 - arquivo nao encontrado: /$path"
                $buf = [Text.Encoding]::UTF8.GetBytes($msg)
                $res.ContentType = 'text/plain; charset=utf-8'
                $res.OutputStream.Write($buf, 0, $buf.Length)
            }
        }
        catch {
            try { $res.StatusCode = 500 } catch { }
        }
        finally {
            try { $res.Close() } catch { }
        }
    }
}
finally {
    if ($listener.IsListening) { $listener.Stop() }
}
