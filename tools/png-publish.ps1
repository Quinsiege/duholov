# Готовые духи из design/png/spirits (sp-<id>.png, 512×512) → в игру:
#   www/art/spirits/<id>.png     — 512 px (встреча, карточка духа, бестиарий крупно)
#   www/art/spirits/sm/<id>.png  — 192 px (карта, списки, мелкие значки)
#   www/js/artpng.js             — список духов, у которых есть картинка (ART_PNG)
# Пока ART_PNG_ON = DEV (config.js): новые картинки видны только в тестовом контуре (localhost).
param([int]$Small = 192)
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$src = Join-Path $root 'design\png\spirits'
$big = Join-Path $root 'www\art\spirits'; $sm = Join-Path $big 'sm'
New-Item -ItemType Directory -Force $big, $sm | Out-Null
$ids = @()
foreach ($f in Get-ChildItem $src -Filter 'sp-*.png' | Sort-Object Name) {
  $id = $f.BaseName.Substring(3); $ids += $id
  Copy-Item $f.FullName (Join-Path $big "$id.png") -Force
  $img = [System.Drawing.Image]::FromFile($f.FullName)
  $dst = New-Object System.Drawing.Bitmap($Small, $Small, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($dst)
  $g.InterpolationMode = 'HighQualityBicubic'; $g.PixelOffsetMode = 'HighQuality'; $g.SmoothingMode = 'HighQuality'; $g.CompositingQuality = 'HighQuality'
  $g.DrawImage($img, 0, 0, $Small, $Small); $g.Dispose(); $img.Dispose()
  $dst.Save((Join-Path $sm "$id.png"), [System.Drawing.Imaging.ImageFormat]::Png); $dst.Dispose()
}
$list = ($ids | ForEach-Object { "'$_'" }) -join ', '
$js = @"
'use strict';
/* Сгенерировано tools/png-publish.ps1 — не править руками.
   Духи с новой PNG-графикой (www/art/spirits/<id>.png и sm/<id>.png). Остальные рисуются прежним SVG. */
const ART_PNG = new Set([$list]);
"@
[IO.File]::WriteAllText((Join-Path $root 'www\js\artpng.js'), $js + "`n", (New-Object Text.UTF8Encoding($false)))
"Духов с PNG: $($ids.Count) — $($ids -join ', ')"
