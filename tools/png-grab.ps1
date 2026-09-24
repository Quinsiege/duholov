# Забрать скачанный из браузера лист (по точному размеру файла — браузер иногда оставляет его как .tmp)
# в design/png/sheets/<Sheet>.png и сразу нарезать через png-split.ps1.
param(
  [Parameter(Mandatory)][long]$Bytes,
  [Parameter(Mandatory)][string]$Sheet,
  [int]$Cols = 3, [int]$Rows = 1,
  [Parameter(Mandatory)][string]$Names,
  [string]$Out = 'spirits',
  [int]$Size = 512
)
$root = Split-Path $PSScriptRoot -Parent
$dl = Join-Path $env:USERPROFILE 'Downloads'
$f = $null
for ($t = 0; $t -lt 20 -and -not $f; $t++) {
  $f = Get-ChildItem $dl -File | Where-Object Length -eq $Bytes | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $f) { Start-Sleep -Milliseconds 500 }
}
if (-not $f) { throw "Не нашёл в Загрузках файл размером $Bytes байт" }
$b = [IO.File]::ReadAllBytes($f.FullName)
if (-not ($b[1] -eq 0x50 -and $b[2] -eq 0x4E -and $b[3] -eq 0x47)) { throw "$($f.Name) — не PNG" }
$dst = Join-Path $root "design\png\sheets\$Sheet.png"
[IO.File]::WriteAllBytes($dst, $b)
try { Remove-Item $f.FullName -ErrorAction Stop } catch { } # .tmp может быть ещё занят браузером — не страшно
& (Join-Path $PSScriptRoot 'png-split.ps1') -In $dst -Cols $Cols -Rows $Rows -Names $Names -Out (Join-Path $root "design\png\$Out") -Size $Size
