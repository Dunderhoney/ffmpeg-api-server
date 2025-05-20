const express = require('express');
const axios = require('axios');
const fs = require('fs-extra');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// /merge endpoint
app.post('/merge', async (req, res) => {
  const urls = req.body.urls;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'No input videos provided.' });
  }

  const sessionId = uuidv4();
  const tempDir = path.join(__dirname, 'temp', sessionId);
  await fs.ensureDir(tempDir);

  try {
    // Ladda ner alla videor
    const downloadedFiles = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const filePath = path.join(tempDir, `video${i}.mp4`);
      const writer = fs.createWriteStream(filePath);

      const response = await axios({
        method: 'get',
        url,
        responseType: 'stream',
      });

      await new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      downloadedFiles.push(filePath);
    }

    // Skapa en lista för FFmpeg
    const listFilePath = path.join(tempDir, 'files.txt');
    const fileListContent = downloadedFiles.map(f => `file '${f}'`).join('\n');
    await fs.writeFile(listFilePath, fileListContent);

    // Skapa output path
    const outputFile = path.join(tempDir, 'output.mp4');

    // Kör FFmpeg merge
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(listFilePath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy'])
        .on('end', resolve)
        .on('error', reject)
        .save(outputFile);
    });

    // Skicka tillbaka filen
    res.download(outputFile, 'merged.mp4', async () => {
      await fs.remove(tempDir); // Städa efteråt
    });

  } catch (err) {
    console.error('Merge error:', err);
    await fs.remove(tempDir);
    res.status(500).json({ error: 'Failed to merge videos.' });
  }
});

// Starta servern
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
