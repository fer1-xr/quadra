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
  try {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`✓ Created ${outputDir} directory`);
  } catch (err) {
    console.warn(`⚠ Could not create ${outputDir}: ${err.message}`);
  }
}

// Download videos with timeout and error handling
const downloadVideo = (video) => {
  return new Promise((resolve) => {
    const filename = `bg-video-${video.id}.mp4`;
    const filepath = path.join(outputDir, filename);

    if (fs.existsSync(filepath)) {
      console.log(`✓ ${filename} already exists`);
      resolve();
      return;
    }

    console.log(`⬇ Downloading ${filename}...`);

    const timeout = setTimeout(() => {
      console.warn(`⚠ Download timeout for ${filename}`);
      resolve();
    }, 10000); // 10 second timeout

    https.get(video.url, { maxRedirects: 5, timeout: 10000 }, (response) => {
      clearTimeout(timeout);
      const file = fs.createWriteStream(filepath);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✓ Downloaded ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      clearTimeout(timeout);
      console.warn(`⚠ Failed to download ${filename}: ${err.message}`);
      try {
        fs.unlinkSync(filepath);
      } catch (e) {}
      resolve();
    });
  });
};

// Download all videos sequentially
(async () => {
  try {
    for (const video of videos) {
      await downloadVideo(video);
    }
    console.log('✓ Video download process completed');
  } catch (err) {
    console.warn(`⚠ Video download process had issues: ${err.message}`);
  }
})();
