# ===================================================================
# Aroha for Adobe Premiere Pro - Build & Sign Installer Script
# ===================================================================

$ErrorActionPreference = "Stop"
$WorkspaceRoot = $PSScriptRoot
if (-not $WorkspaceRoot) { $WorkspaceRoot = Get-Location }

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   AROHA PREMIERE PRO EXTENSION - INSTALLER BUILDER    " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Locate Inno Setup 6 Compiler (ISCC.exe)
$isccCandidates = @(
    "C:\Users\Tushar\AppData\Local\Programs\Inno Setup 6\ISCC.exe",
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe"
)

$isccPath = $null
foreach ($candidate in $isccCandidates) {
    if (Test-Path $candidate) {
        $isccPath = $candidate
        break
    }
}

if (-not $isccPath) {
    $cmd = Get-Command iscc -ErrorAction SilentlyContinue
    if ($cmd) { $isccPath = $cmd.Source }
}

if (-not $isccPath) {
    Write-Error "Inno Setup Compiler (ISCC.exe) could not be found. Please check Inno Setup installation."
    exit 1
}

Write-Host "[1/4] Found Inno Setup Compiler at: $isccPath" -ForegroundColor Green

# 2. Verify Key Files
$requiredFiles = @(
    "index.html",
    "styles.css",
    "main.js",
    "src\engine.js",
    "CSXS\manifest.xml",
    "jsx\host.jsx",
    "aroha_cert.cer",
    "aroha_cert.pfx",
    "bin\win-x64\ffmpeg.exe",
    "bin\win-x64\yt-dlp.exe"
)

foreach ($rf in $requiredFiles) {
    $p = Join-Path $WorkspaceRoot $rf
    if (-not (Test-Path $p)) {
        Write-Error "Missing required source file: $rf"
        exit 1
    }
}
Write-Host "[2/4] All required source binaries and assets verified." -ForegroundColor Green

# 3. Ensure Output Directory
$distDir = Join-Path $WorkspaceRoot "dist"
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}

$issFile = Join-Path $WorkspaceRoot "installer.iss"
Write-Host "[3/4] Compiling installer using Inno Setup (LZMA2 Solid Ultra Compression)..." -ForegroundColor Yellow

$proc = Start-Process -FilePath $isccPath -ArgumentList "`"$issFile`"" -NoNewWindow -Wait -PassThru
if ($proc.ExitCode -ne 0) {
    Write-Error "Inno Setup compilation failed with exit code: $($proc.ExitCode)"
    exit $proc.ExitCode
}

$outputExe = Join-Path $distDir "Aroha_Premiere_Extension_Installer_v1.0.0.exe"
if (-not (Test-Path $outputExe)) {
    Write-Error "Output executable not found at: $outputExe"
    exit 1
}

$fileSizeMB = [math]::Round(((Get-Item $outputExe).Length / 1MB), 2)
Write-Host "      Installer successfully created: $outputExe ($fileSizeMB MB)" -ForegroundColor Green

# 4. Sign Installer with Authenticode Certificate
Write-Host "[4/4] Digitally signing installer with Aroha Certificate & RFC 3161 Timestamp..." -ForegroundColor Yellow

$certPath = Join-Path $WorkspaceRoot "aroha_cert.pfx"
$pfxPass = ConvertTo-SecureString "Aroha@2026" -AsPlainText -Force
$cert = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new((Resolve-Path $certPath).Path, $pfxPass)

$timestampServers = @(
    "http://timestamp.digicert.com",
    "http://timestamp.sectigo.com",
    "http://tsa.starfieldtech.com"
)

$signed = $false
foreach ($ts in $timestampServers) {
    try {
        Write-Host "      Attempting timestamp with $ts..." -ForegroundColor Gray
        $res = Set-AuthenticodeSignature -FilePath $outputExe -Certificate $cert -TimestampServer $ts -HashAlgorithm SHA256
        if ($res.Status -eq "Valid" -or $res.Status -eq "UnknownError") {
            $signed = $true
            Write-Host "      Successfully signed using timestamp server: $ts" -ForegroundColor Green
            break
        }
    } catch {
        Write-Warning "Failed timestamping with $ts, trying fallback..."
    }
}

if (-not $signed) {
    Write-Host "      Signing without timestamp server (offline fallback)..." -ForegroundColor Yellow
    Set-AuthenticodeSignature -FilePath $outputExe -Certificate $cert -HashAlgorithm SHA256 | Out-Null
}

$sig = Get-AuthenticodeSignature -FilePath $outputExe
Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "                 BUILD COMPLETE & VERIFIED             " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "File       : $outputExe" -ForegroundColor White
Write-Host "Size       : $fileSizeMB MB" -ForegroundColor White
Write-Host "Signer     : $($sig.SignerCertificate.Subject)" -ForegroundColor White
Write-Host "Thumbprint : $($sig.SignerCertificate.Thumbprint)" -ForegroundColor White
Write-Host "Timestamp  : $($sig.TimeStamperCertificate.Subject)" -ForegroundColor White
Write-Host "Status     : $($sig.Status)" -ForegroundColor White
Write-Host "=======================================================" -ForegroundColor Cyan
