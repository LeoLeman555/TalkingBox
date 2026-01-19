$ErrorActionPreference = "Stop"

function Info($msg) {
  Write-Host "[INFO]  $msg" -ForegroundColor Cyan
}

function Success($msg) {
  Write-Host "[OK]    $msg" -ForegroundColor Green
}

function Warn($msg) {
  Write-Host "[WARN]  $msg" -ForegroundColor Yellow
}

function Fail($msg) {
  Write-Host "[ERROR] $msg" -ForegroundColor Red
  exit 1
}

Write-Host "=== Talking Box | ESP32 Firmware Deployment ===" -ForegroundColor Magenta

# --- Configuration ---
$FirmwarePath = "firmware/src"
$Files = @(
  "start.py",
  "ble.py",
  "audio.py",
  "storage.py",
  "sdcard.py"
)

# --- Pre-flight checks ---
Info "Checking mpremote availability..."
if (-not (Get-Command mpremote -ErrorAction SilentlyContinue)) {
  Fail "mpremote is not installed or not available in PATH."
}
Success "mpremote found"

Info "Checking firmware files..."
foreach ($file in $Files) {
  $fullPath = Join-Path $FirmwarePath $file
  if (-not (Test-Path $fullPath)) {
    Fail "Missing firmware file: $fullPath"
  }
}
Success "All firmware files are present"

# --- Deployment ---
Info "Starting firmware deployment..."

foreach ($file in $Files) {
  $source = Join-Path $FirmwarePath $file
  $target = ":$file"

  Info "Copying $file"
  mpremote cp $source $target
}

Success "All files successfully copied"

# --- Reset ---
Info "Resetting ESP32..."
mpremote reset
Success "ESP32 reset completed"

Write-Host "Deployment completed successfully." -ForegroundColor Green
