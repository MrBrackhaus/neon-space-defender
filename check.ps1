
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('s:\Projekte\Neon Space Defender\v2\public\tech_weapons.jpg')
Write-Host "Width: $($img.Width), Height: $($img.Height)"
$img.Dispose()
