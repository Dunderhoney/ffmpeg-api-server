const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());

app.post('/convert', upload.single('video'), (req, res) => {
  const inputPath = req.file.path;
  const outputPath = `outputs/${Date.now()}_output.mp4`;

  ffmpeg(inputPath)
    .outputOptions('-vf', 'scale=1080:1920')
    .on('end', () => {
      res.download(outputPath, () => {
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
      });
    })
    .on('error', (err) => {
      console.error(err);
      res.status(500).send('Conversion error');
    })
    .save(outputPath);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
