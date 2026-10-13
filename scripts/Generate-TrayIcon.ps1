$ErrorActionPreference='Stop'
$base=Split-Path -Parent $PSScriptRoot
$assets=Join-Path $base 'assets'
Add-Type -AssemblyName PresentationCore,WindowsBase
[xml]$svg=Get-Content -LiteralPath (Join-Path $assets 'codex-logo.svg') -Raw
$geometry=[System.Windows.Media.Geometry]::Parse($svg.GetElementsByTagName('path')[0].GetAttribute('d'))
$visual=New-Object System.Windows.Media.DrawingVisual
$context=$visual.RenderOpen()
$scale=256.0/418.0
$matrix=New-Object System.Windows.Media.Matrix($scale,0,0,$scale,(-149*$scale),(-149*$scale))
$context.PushTransform((New-Object System.Windows.Media.MatrixTransform($matrix)))
$context.DrawGeometry([System.Windows.Media.Brushes]::Black,$null,$geometry)
$context.Pop()
$image=New-Object System.Windows.Media.Imaging.BitmapImage
$image.BeginInit();$image.UriSource=New-Object Uri((Join-Path $assets 'codex-logo-icon.png'));$image.CacheOption='OnLoad';$image.EndInit()
$context.DrawImage($image,(New-Object System.Windows.Rect(0,0,256,256)))
$context.Close()
$bitmap=New-Object System.Windows.Media.Imaging.RenderTargetBitmap(256,256,96,96,[System.Windows.Media.PixelFormats]::Pbgra32)
$bitmap.Render($visual)
$encoder=New-Object System.Windows.Media.Imaging.PngBitmapEncoder
$encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($bitmap))
$stream=[System.IO.File]::Create((Join-Path $assets 'codex-logo-tray.png'));try{$encoder.Save($stream)}finally{$stream.Dispose()}
