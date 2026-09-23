# Simple local static server for the www folder (desktop testing): http://localhost:8765
param([int]$Port = 8765)
$root = Join-Path $PSScriptRoot '..\www' | Resolve-Path
$mime = @{ '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8';
  '.png' = 'image/png'; '.svg' = 'image/svg+xml'; '.json' = 'application/json'; '.webmanifest' = 'application/manifest+json' }
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
Write-Host "Duholov: http://localhost:$Port/  (Ctrl+C to stop)"
while ($l.IsListening) {
  $ctx = $l.GetContext()
  $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
  if ($path -eq '') { $path = 'index.html' }
  $file = Join-Path $root $path
  $res = $ctx.Response
  if ((Test-Path $file -PathType Leaf) -and ([IO.Path]::GetFullPath($file).StartsWith($root.Path))) {
    $bytes = [IO.File]::ReadAllBytes($file)
    $ext = [IO.Path]::GetExtension($file).ToLower()
    $res.ContentType = if ($mime[$ext]) { $mime[$ext] } else { 'application/octet-stream' }
    $res.Headers.Add('Cache-Control', 'no-cache')
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } else { $res.StatusCode = 404 }
  $res.Close()
}
