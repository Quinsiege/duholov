# Build the game server (Supabase Edge Function "game") from shared game modules.
# Output: server/functions/game/index.ts  (commit it; CI checks it is up to date)
param([switch]$Check)
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$utf8 = New-Object System.Text.UTF8Encoding $false
$files = @(
  'server/game/prelude.js',
  'www/js/data.js', 'www/js/util.js', 'www/js/events.js', 'www/js/sky.js', 'www/js/world.js',
  'www/js/state.js', 'www/js/journal.js', 'www/js/league.js', 'www/js/raid.js', 'www/js/duel.js',
  'www/js/rules.js', 'www/js/diff.js', 'server/game/core.js', 'server/game/serve.js'
)
$ver = [regex]::Match([IO.File]::ReadAllText((Join-Path $root 'www/js/version.js')), "APP_VERSION = '([\d.]+)'").Groups[1].Value
$sb = New-Object System.Text.StringBuilder
foreach ($f in $files) {
  $text = [IO.File]::ReadAllText((Join-Path $root $f)).Replace("`r`n", "`n")
  if ($f -ne 'server/game/prelude.js') {
    $text = $text -replace "(?m)^'use strict';\n", ''
    [void]$sb.Append("`n// ===== $f =====`n")
  }
  [void]$sb.Append($text)
}
$out = $sb.ToString().Replace('__APP_VERSION__', $ver)
$target = Join-Path $root 'server/functions/game/index.ts'
if ($Check) {
  $cur = if (Test-Path $target) { [IO.File]::ReadAllText($target).Replace("`r`n", "`n") } else { '' }
  if ($cur -ne $out) { Write-Host 'server/functions/game/index.ts is out of date: run tools/build-server.ps1'; exit 1 }
  Write-Host 'server bundle is up to date'; exit 0
}
New-Item -ItemType Directory -Force (Split-Path $target) | Out-Null
[IO.File]::WriteAllText($target, $out, $utf8)
Write-Host "Built $target ($([math]::Round($out.Length / 1024)) KB, version $ver)"
