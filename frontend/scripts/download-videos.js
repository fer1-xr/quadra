import https from 'https';
import fs from 'fs';
import path from 'path';

const videos = [
  { id: 1, url: 'https://www.pexels.com/es-es/download/video/36808131/' },
  { id: 2, url: 'https://www.pexels.com/es-es/download/video/33054007/' }
];

const outputDir = path.join(process.cwd(), 'public', 'videos');

// Create directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`✓ Created ${outputDir} directory`);
}

// Download videos
videos.forEach(video => {
  const filename = `bg-video-${video.id}.mp4`;
  const filepath = path.join(outputDir, filename);

  if (fs.existsSync(filepath)) {
    console.log(`✓ ${filename} already exists`);
    return;
  }

  console.log(`⬇ Downloading ${filename}...`);
  https.get(video.url, { maxRedirects: 5 }, (response) => {
    const file = fs.createWriteStream(filepath);
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`✓ Downloaded ${filename}`);
    });
  }).on('error', (err) => {
    fs.unlink(filepath, () => {});
    console.error(`✗ Failed to download ${filename}: ${err.message}`);
  });
});
