<#
.SYNOPSIS
    Modo apresentacao - prepara este notebook como host do servidor (Opcao A).

.DESCRIPTION
    Sobe a stack completa (docker compose) e mostra a URL que o OUTRO notebook
    deve abrir no navegador para acessar o front-end pela rede do celular/LAN.

    Nao ha mudanca de codigo: o front-end fala com o backend pela mesma origem,
    entao acessar por http://IP-deste-notebook:porta funciona igual a localhost.

.PARAMETER Build
    Reconstroi as imagens antes de subir (use apos mudancas no codigo).

.PARAMETER NoStart
    Apenas configura firewall e mostra a URL, sem rodar o docker compose.

.EXAMPLE
    # Rode no notebook-servidor (de preferencia como Administrador):
    powershell -ExecutionPolicy Bypass -File .\iniciar-apresentacao.ps1
#>
[CmdletBinding()]
param(
    [switch]$Build,
    [switch]$NoStart
)

$ErrorActionPreference = "Stop"
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir

# --- 1. Descobrir a porta do front-end a partir do .env (default 8080) ---
$port = 8080
$envFile = Join-Path $projectDir ".env"
if (Test-Path $envFile) {
    $match = Select-String -Path $envFile -Pattern '^\s*FRONTEND_PORT\s*=\s*(\d+)' | Select-Object -First 1
    if ($match) { $port = [int]$match.Matches[0].Groups[1].Value }
}

Write-Host "=== Simulacao-Represa - Modo Apresentacao ===" -ForegroundColor Cyan
Write-Host "Porta do front-end: $port`n"

# --- 2. Regra de firewall (precisa de Administrador) ---
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

$ruleName = "Simulacao-Represa $port"
if ($isAdmin) {
    $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "[firewall] Regra '$ruleName' ja existe." -ForegroundColor DarkGray
    } else {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound `
            -Protocol TCP -LocalPort $port -Action Allow | Out-Null
        Write-Host "[firewall] Regra '$ruleName' criada (porta $port liberada)." -ForegroundColor Green
    }
} else {
    Write-Host "[firewall] AVISO: rode como Administrador para liberar a porta automaticamente." -ForegroundColor Yellow
    Write-Host "          Comando (uma vez, em PowerShell Admin):" -ForegroundColor Yellow
    Write-Host "          New-NetFirewallRule -DisplayName '$ruleName' -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow`n" -ForegroundColor Yellow
}

# --- 3. Detectar o IP da rede ativa (a do hotspot/LAN com gateway) ---
$candidates = Get-NetIPConfiguration |
    Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq "Up" } |
    ForEach-Object { $_.IPv4Address.IPAddress } |
    Where-Object { $_ -and $_ -notlike "127.*" -and $_ -notlike "169.254.*" }

# --- 4. Subir a stack ---
if (-not $NoStart) {
    Write-Host "[docker] Subindo a stack..." -ForegroundColor Cyan
    if ($Build) { docker compose up -d --build } else { docker compose up -d }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[docker] Falha ao subir. O Docker Desktop esta rodando?" -ForegroundColor Red
        exit 1
    }
}

# --- 5. Mostrar a URL de acesso ---
Write-Host "`n=== Pronto! Acesse do OUTRO notebook ===" -ForegroundColor Green
if ($candidates) {
    foreach ($ip in $candidates) {
        Write-Host ("    http://{0}:{1}" -f $ip, $port) -ForegroundColor White
    }
    Write-Host "`n(Se houver mais de um endereco, use o da rede do celular/hotspot.)" -ForegroundColor DarkGray
} else {
    Write-Host "    Nenhum IP de rede ativo encontrado. Conecte-se ao hotspot e rode 'ipconfig'." -ForegroundColor Yellow
}
Write-Host "`nNeste notebook voce tambem pode usar: http://localhost:$port" -ForegroundColor DarkGray
Write-Host "Teste de rede a partir do outro notebook: ping no IP acima" -ForegroundColor DarkGray
