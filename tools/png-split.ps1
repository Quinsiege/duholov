# Нарезка PNG-листов с прозрачным фоном (графика из ChatGPT) на отдельные картинки.
#   -In     лист PNG
#   -Cols/-Rows  сетка (для тройки духов: -Cols 3 -Rows 1)
#   -Names  имена файлов по порядку ячеек (слева направо, сверху вниз), через запятую; пустое имя — пропустить ячейку
#   -Out    папка; -Size  сторона итогового квадрата (по умолчанию 512)
# Картинка делится на «островки» непрозрачных пикселей; островок отдаётся той ячейке, где его центр масс.
# Слабое свечение (альфа ≤ 128) берётся из полосы ячейки (граница — самая пустая линия между объектами).
# Так дым и брызги соседа, залезшие в чужую треть, не попадают в чужую картинку. Объект вписывается в квадрат.
param(
  [Parameter(Mandatory)][string]$In,
  [int]$Cols = 3, [int]$Rows = 1,
  [Parameter(Mandatory)][string[]]$Names,
  [Parameter(Mandatory)][string]$Out,
  [int]$Size = 512
)
$Names = @($Names | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() }) # при запуске через -File список приходит одной строкой
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Collections.Generic; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public class PngSheet {
  int W, H, Stride, Cols; byte[] Px; int[] Lab; int[] Owner; int[] CX, CY; // Owner[label] = номер ячейки; CX/CY — границы полос
  public PngSheet(Bitmap bmp, int cols, int rows, int thr) {
    W = bmp.Width; H = bmp.Height; Cols = cols;
    var d = bmp.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    Stride = d.Stride; Px = new byte[Stride * H]; Marshal.Copy(d.Scan0, Px, 0, Px.Length); bmp.UnlockBits(d);
    // островки (8-связность) по альфе > thr
    Lab = new int[W * H]; var sx = new List<double>(); var sy = new List<double>(); var cnt = new List<int>();
    sx.Add(0); sy.Add(0); cnt.Add(0); var q = new Stack<int>();
    for (int i = 0; i < W * H; i++) {
      if (Lab[i] != 0 || A(i) <= thr) continue;
      int id = cnt.Count; double ax = 0, ay = 0; int n = 0; Lab[i] = id; q.Push(i);
      while (q.Count > 0) {
        int p = q.Pop(), x = p % W, y = p / W; ax += x; ay += y; n++;
        for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
          int nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          int np = ny * W + nx; if (Lab[np] == 0 && A(np) > thr) { Lab[np] = id; q.Push(np); }
        }
      }
      sx.Add(ax); sy.Add(ay); cnt.Add(n);
    }
    CX = Cuts(true, cols); CY = Cuts(false, rows);
    Owner = new int[cnt.Count];
    for (int k = 1; k < cnt.Count; k++) {
      int c = Math.Min(cols - 1, (int)(sx[k] / cnt[k] * cols / W)), r = Math.Min(rows - 1, (int)(sy[k] / cnt[k] * rows / H));
      Owner[k] = r * cols + c;
    }
  }
  int A(int i) { return Px[(i / W) * Stride + (i % W) * 4 + 3]; }
  // границы n полос: между объектами — самая «пустая» линия в окне ±20% от равного деления
  int[] Cuts(bool byX, int n) {
    int len = byX ? W : H; var prof = new long[len];
    for (int i = 0; i < W * H; i++) { int a = A(i); if (a > 8) prof[byX ? i % W : i / W] += a; }
    var cuts = new int[n + 1]; cuts[n] = len; double step = (double)len / n;
    for (int k = 1; k < n; k++) {
      int c = (int)(step * k), w = (int)(step * 0.2), best = c; long bv = long.MaxValue;
      for (int p = Math.Max(1, c - w); p < Math.Min(len - 1, c + w); p++) { long v = prof[p] * 1000 + Math.Abs(p - c); if (v < bv) { bv = v; best = p; } }
      cuts[k] = best;
    }
    return cuts;
  }
  // Картинка ячейки cell: её островки + полупрозрачная кайма (свечение) в радиусе rad от них
  public Bitmap Cell(int cell, int rad, out Rectangle box) {
    var keep = new bool[W * H]; int x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (int i = 0; i < W * H; i++) if (Lab[i] != 0 && Owner[Lab[i]] == cell) {
      keep[i] = true; int x = i % W, y = i / W; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    box = x1 < 0 ? Rectangle.Empty : new Rectangle(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    // кайма: слабые пиксели (не в островках) рядом с островками ячейки
    var near = new bool[W * H];
    for (int y = 0; y < H; y++) for (int x = 0; x < W; x++) {
      if (!keep[y * W + x]) continue;
      for (int dy = -rad; dy <= rad; dy += rad) for (int dx = -rad; dx <= rad; dx += rad) {
        int nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) near[ny * W + nx] = true;
      }
    }
    var outBmp = new Bitmap(W, H, PixelFormat.Format32bppArgb);
    var d = outBmp.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
    var o = new byte[d.Stride * H];
    for (int y = 0; y < H; y++) for (int x = 0; x < W; x++) {
      int i = y * W + x, cc = cell % Cols, rr = cell / Cols;
      bool inBand = x >= CX[cc] && x < CX[cc + 1] && y >= CY[rr] && y < CY[rr + 1];
      bool ok = keep[i] || (Lab[i] == 0 && (near[i] || inBand));
      if (!ok) continue; int s = y * Stride + x * 4, t = y * d.Stride + x * 4;
      o[t] = Px[s]; o[t + 1] = Px[s + 1]; o[t + 2] = Px[s + 2]; o[t + 3] = Px[s + 3];
    }
    Marshal.Copy(o, 0, d.Scan0, o.Length); outBmp.UnlockBits(d);
    return outBmp;
  }
}
'@
$src = New-Object System.Drawing.Bitmap((Resolve-Path $In).Path)
$bmp = New-Object System.Drawing.Bitmap($src.Width, $src.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g0 = [System.Drawing.Graphics]::FromImage($bmp); $g0.DrawImage($src, 0, 0, $src.Width, $src.Height); $g0.Dispose(); $src.Dispose()
$opaque = @(@(0, 0), @(($bmp.Width - 1), 0), @(0, ($bmp.Height - 1)), @(($bmp.Width - 1), ($bmp.Height - 1)) | Where-Object { $bmp.GetPixel($_[0], $_[1]).A -gt 200 }).Count
if ($opaque -ge 3) { $bmp.Dispose(); throw "Фон не прозрачный (углы непрозрачные) — нужна перегенерация: $In" }
New-Item -ItemType Directory -Force $Out | Out-Null
$sheet = New-Object PngSheet($bmp, $Cols, $Rows, 128) # островки — по уверенно непрозрачным пикселям, свечение добирается полосой
for ($i = 0; $i -lt $Cols * $Rows; $i++) {
  $name = if ($i -lt $Names.Count) { $Names[$i] } else { '' }
  if (-not $name) { continue }
  $b = [System.Drawing.Rectangle]::Empty
  $cell = $sheet.Cell($i, 6, [ref]$b)
  if ($b.Width -eq 0) { Write-Warning "${name}: пустая ячейка"; $cell.Dispose(); continue }
  $b.Inflate(16, 16); $b.Intersect((New-Object System.Drawing.Rectangle(0, 0, $bmp.Width, $bmp.Height))) # запас под мягкое свечение
  $side = [Math]::Max($b.Width, $b.Height); $scale = ($Size * 0.88) / $side
  $w = [int]($b.Width * $scale); $h = [int]($b.Height * $scale)
  $dst = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($dst)
  $g.InterpolationMode = 'HighQualityBicubic'; $g.PixelOffsetMode = 'HighQuality'; $g.SmoothingMode = 'HighQuality'; $g.CompositingQuality = 'HighQuality'
  # по горизонтали — по центру, по вертикали — низ объекта на одной линии (духи «стоят» на земле)
  $x = [int](($Size - $w) / 2); $y = [int]($Size * 0.94 - $h)
  $g.DrawImage($cell, (New-Object System.Drawing.Rectangle($x, $y, $w, $h)), $b, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose(); $cell.Dispose()
  $path = Join-Path $Out "$name.png"; $dst.Save($path, [System.Drawing.Imaging.ImageFormat]::Png); $dst.Dispose()
  "{0}  <- {1}x{2} @ {3},{4}" -f $path, $b.Width, $b.Height, $b.X, $b.Y
}
$bmp.Dispose()
