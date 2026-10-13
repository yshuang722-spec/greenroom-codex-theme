param([switch]$Staged)
$ErrorActionPreference = 'Stop'
$base = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $base 'assets'
$iconPath = Join-Path $assets 'GreenRoomTray.ico'
$sourcePath = Join-Path $PSScriptRoot 'GreenRoomTray.cs'
$outputName = if ($Staged) { 'GreenRoomTray-Win11-staged.exe' } else { 'GreenRoomTray-Win11.exe' }
$outputPath = Join-Path $base $outputName
Add-Type -AssemblyName System.Drawing
function New-GreenRoomBitmap([int]$size, [string]$sourceName='codex-logo-icon.png') {
  $sourcePath = Join-Path $base $sourceName
  if (!(Test-Path -LiteralPath $sourcePath)) { throw 'Transparent Codex logo raster is missing.' }
  $bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $source = [System.Drawing.Image]::FromFile($sourcePath)
  if ([IO.Path]::GetFileName($sourceName) -eq 'codex-logo-tray.png') {
    $left=$source.Width; $top=$source.Height; $right=0; $bottom=0
    for($y=0;$y -lt $source.Height;$y++){for($x=0;$x -lt $source.Width;$x++){if($source.GetPixel($x,$y).A -gt 0){$left=[Math]::Min($left,$x);$top=[Math]::Min($top,$y);$right=[Math]::Max($right,$x);$bottom=[Math]::Max($bottom,$y)}}}
    $visibleWidth=$right-$left+1; $visibleHeight=$bottom-$top+1
    $scale=[Math]::Min(($size-2.0)/$visibleWidth,($size-2.0)/$visibleHeight)
    $drawWidth=[int][Math]::Round($source.Width*$scale);$drawHeight=[int][Math]::Round($source.Height*$scale)
    $drawX=[int][Math]::Round(($size-$drawWidth)/2);$drawY=[int][Math]::Round(($size-$drawHeight)/2)
    $graphics.DrawImage($source,$drawX,$drawY,$drawWidth,$drawHeight)
  } else {
    $scale = [Math]::Min(($size - 2.0) / $source.Width, ($size - 2.0) / $source.Height)
    $width = [int][Math]::Round($source.Width * $scale)
    $height = [int][Math]::Round($source.Height * $scale)
    $graphics.DrawImage($source,[int](($size-$width)/2),[int](($size-$height)/2),$width,$height)
  }
  $source.Dispose(); $graphics.Dispose()
  return $bitmap
}function Write-GreenRoomIcon([string]$sourceName,[string]$destination) {
$frames = @(16,24,32,48,256 | ForEach-Object {
  $bitmap = New-GreenRoomBitmap $_ $sourceName
  $stream = New-Object System.IO.MemoryStream
  $bitmap.Save($stream,[System.Drawing.Imaging.ImageFormat]::Png)
  $bytes = $stream.ToArray()
  $stream.Dispose(); $bitmap.Dispose()
  [pscustomobject]@{ Size=$_; Bytes=$bytes }
})
$iconStream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter($iconStream)
$writer.Write([UInt16]0); $writer.Write([UInt16]1); $writer.Write([UInt16]$frames.Count)
$offset = 6 + 16 * $frames.Count
foreach ($frame in $frames) {
  $dimension = if ($frame.Size -eq 256) { [byte]0 } else { [byte]$frame.Size }
  $writer.Write($dimension); $writer.Write($dimension); $writer.Write([byte]0); $writer.Write([byte]0)
  $writer.Write([UInt16]1); $writer.Write([UInt16]32); $writer.Write([UInt32]$frame.Bytes.Length); $writer.Write([UInt32]$offset)
  $offset += $frame.Bytes.Length
}
foreach ($frame in $frames) { $writer.Write($frame.Bytes) }
[IO.File]::WriteAllBytes($destination,$iconStream.ToArray())
$writer.Dispose(); $iconStream.Dispose()

}
& (Join-Path $PSScriptRoot 'Generate-TrayIcon.ps1')
Write-GreenRoomIcon 'assets\codex-logo-icon.png' $iconPath
Write-GreenRoomIcon 'assets\codex-logo-tray.png' (Join-Path $assets 'Codex-Terminal-Tray.ico')
$csc = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (!(Test-Path $csc)) { throw 'Windows .NET Framework C# compiler was not found.' }
& $csc /nologo /target:winexe /platform:anycpu /optimize+ /reference:System.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll /reference:System.Web.Extensions.dll /win32icon:$iconPath /out:$outputPath $sourcePath
if ($LASTEXITCODE -ne 0) { throw 'Tray application build failed.' }
Write-Output $outputPath
