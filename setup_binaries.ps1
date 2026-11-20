# ===================================================================
# Aroha for Adobe Premiere Pro - Setup Local Binaries
# ===================================================================
# Downloads portable yt-dlp nightly and FFmpeg essentials into bin/win-x64

$ErrorActionPreference = "Stop"
$binDir = Join-Path $PSScriptRoot "bin\win-x64"

if (-not (Test-Path $binDir)) {
    New-Item -ItemType Directory -Path $binDir -Force | Out-Null
}

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "        AROHA PREMIERE EXTENSION - BINARY SETUP        " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Download yt-dlp nightly
$ytdlpDest = Join-Path $binDir "yt-dlp.exe"
if (-not (Test-Path $ytdlpDest)) {
    Write-Host "[1/2] Downloading yt-dlp nightly (latest)..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp.exe" -OutFile $ytdlpDest
    Write-Host "      yt-dlp installed successfully." -ForegroundColor Green
} else {
    Write-Host "[1/2] yt-dlp already present at $ytdlpDest" -ForegroundColor Gray
}

# 2. Download & extract FFmpeg + FFprobe
$ffmpegDest = Join-Path $binDir "ffmpeg.exe"
$ffprobeDest = Join-Path $binDir "ffprobe.exe"
if ((-not (Test-Path $ffmpegDest)) -or (-not (Test-Path $ffprobeDest))) {
    Write-Host "[2/2] Downloading Gyan.dev FFmpeg essentials package (~100 MB)..." -ForegroundColor Yellow
    $zipPath = Join-Path $binDir "ffmpeg-temp.zip"
    $ffmpegUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
    Invoke-WebRequest -Uri $ffmpegUrl -OutFile $zipPath
    Write-Host "      Extracting ffmpeg.exe & ffprobe.exe into bin/win-x64..." -ForegroundColor Yellow
    tar -xf $zipPath --strip-components 2 -C $binDir "*/bin/ffmpeg.exe" "*/bin/ffprobe.exe"
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
    Write-Host "      FFmpeg and FFprobe installed successfully." -ForegroundColor Green
} else {
    Write-Host "[2/2] FFmpeg and FFprobe already present at $ffmpegDest" -ForegroundColor Gray
}

Write-Host ""
Write-Host "All required binaries are ready for Aroha Premiere Extension!" -ForegroundColor Green
