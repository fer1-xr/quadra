# Download background videos from Pexels
$urls = @(
    "https://www.pexels.com/es-es/download/video/36808131/",
    "https://www.pexels.com/es-es/download/video/33054007/"
)

$outputDir = "public/videos"
$names = @("bg-video-1.mp4", "bg-video-2.mp4")

# Create videos directory if it doesn't exist
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
    Write-Host "✓ Created $outputDir directory"
}

# Download each video
for ($i = 0; $i -lt $urls.Count; $i++) {
    $url = $urls[$i]
    $outputPath = Join-Path $outputDir $names[$i]

    if (Test-Path $outputPath) {
        Write-Host "✓ $($names[$i]) already exists, skipping"
    } else {
        Write-Host "⬇ Downloading $($names[$i])..."
        try {
            # Use -SkipHttpErrorCheck to handle redirects
            $response = Invoke-WebRequest -Uri $url -OutFile $outputPath -UseBasicParsing -ErrorAction Stop
            Write-Host "✓ Downloaded $($names[$i]) successfully"
        } catch {
            Write-Host "✗ Failed to download $($names[$i]): $_"
            Write-Host "  Please download manually from: $url"
            Write-Host "  And save as: $outputPath"
        }
    }
}

Write-Host ""
Write-Host "✓ Video setup complete!"
