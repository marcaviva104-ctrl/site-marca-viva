# Servidor local estático — sem Node.js.
# Uso: clique com botão direito → "Executar com PowerShell"
#   ou no terminal: powershell -ExecutionPolicy Bypass -File .\serve-local.ps1
# Depois abra: http://127.0.0.1:8787/pages/index.html

$Port = 8787
$Root = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

function Test-Python {
    foreach ($name in @('py', 'python', 'python3')) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue
        if ($cmd) { return $name }
    }
    return $null
}

$py = Test-Python
if ($py) {
    Write-Host ""
    Write-Host ">>> Servindo a pasta do projeto com: $py -m http.server" -ForegroundColor Green
    Write-Host ">>> Abra no navegador: http://127.0.0.1:$Port/pages/index.html" -ForegroundColor Cyan
    Write-Host ">>> Pare o servidor: Ctrl+C" -ForegroundColor Yellow
    Write-Host ""
    Set-Location $Root
    # Servidor em primeiro plano (Ctrl+C para parar)
    & $py -m http.server $Port
    exit
}

# --- Fallback: HttpListener em PowerShell (sem Python) ---
Add-Type -AssemblyName System.Web

function Get-Mime([string]$ext) {
    switch ($ext.ToLowerInvariant()) {
        '.html' { 'text/html; charset=utf-8' }
        '.htm'  { 'text/html; charset=utf-8' }
        '.css'  { 'text/css; charset=utf-8' }
        '.js'   { 'application/javascript; charset=utf-8' }
        '.json' { 'application/json; charset=utf-8' }
        '.svg'  { 'image/svg+xml' }
        '.png'  { 'image/png' }
        '.jpg'  { 'image/jpeg' }
        '.jpeg' { 'image/jpeg' }
        '.gif'  { 'image/gif' }
        '.webp' { 'image/webp' }
        '.ico'  { 'image/x-icon' }
        '.woff' { 'font/woff' }
        '.woff2'{ 'font/woff2' }
        default { 'application/octet-stream' }
    }
}

$prefix = "http://127.0.0.1:$Port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "Não foi possível iniciar o servidor na porta $Port." -ForegroundColor Red
    Write-Host "  (porta em uso, ou permissão Windows para esta URL — instale Python para usar http.server.)" -ForegroundColor Gray
    Read-Host "Enter para sair"
    exit 1
}

Write-Host ""
Write-Host ">>> Servidor local (PowerShell) em: $prefix" -ForegroundColor Green
Write-Host ">>> Abra: http://127.0.0.1:$Port/pages/index.html" -ForegroundColor Cyan
Write-Host ">>> Pasta: $Root" -ForegroundColor Gray
Write-Host ">>> Pare: Ctrl+C" -ForegroundColor Yellow
Write-Host ""

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $res = $ctx.Response
        try {
            $path = [System.Web.HttpUtility]::UrlDecode($req.Url.AbsolutePath.TrimStart('/'))
            if ($path -eq '' -or $path -eq '/') {
                $res.Redirect("http://127.0.0.1:$Port/pages/index.html")
                $res.Close()
                continue
            }
            $full = [System.IO.Path]::GetFullPath((Join-Path $Root $path.Replace('/', [IO.Path]::DirectorySeparatorChar)))
            $rootGuard = if ($Root.EndsWith('\')) { $Root } else { "$Root\" }
            $inside = ($full -eq $Root) -or $full.StartsWith($rootGuard, [StringComparison]::OrdinalIgnoreCase)
            if (-not $inside) {
                $res.StatusCode = 403
                $buf = [Text.Encoding]::UTF8.GetBytes('403')
                $res.OutputStream.Write($buf, 0, $buf.Length)
            } elseif (Test-Path $full -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($full)
                $res.ContentType = Get-Mime([IO.Path]::GetExtension($full))
                $res.ContentLength64 = $bytes.LongLength
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $res.StatusCode = 404
                $buf = [Text.Encoding]::UTF8.GetBytes('404 Not Found')
                $res.OutputStream.Write($buf, 0, $buf.Length)
            }
        } catch {
            try { $res.StatusCode = 500 } catch { }
        } finally {
            try { $res.Close() } catch { }
        }
    }
} finally {
    if ($listener.IsListening) { $listener.Stop() }
}
