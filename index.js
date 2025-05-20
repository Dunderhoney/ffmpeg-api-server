const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("FFmpeg merge server is running!");
});

app.post("/merge", async (req, res) => {
  try {
    const urls = req.body.urls;
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).send("No video URLs provided.");
    }

    const tempFolder = `tmp-${uuidv4()}`;
    fs.mkdirSync(tempFolder);

    const videoPaths = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const videoPath = `${tempFolder}/video${i}.mp4`;
      const writer = fs.createWriteStream(videoPath);
      const response = await axios({
        url,
        method: "GET",
        responseType: "stream"
      });
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
      videoPaths.push(videoPath);
    }

    const fileListPath = `${tempFolder}/files.txt`;
    const fileListContent = videoPaths.map(path => `file '${path}'`).join("\n");
    fs.writeFileSync(fileListPath, fileListContent);

    const outputPath = `${tempFolder}/output.mp4`;

    await new Promise((resolve, reject) => {
      exec(`ffmpeg -f concat -safe 0 -i ${fileListPath} -c copy ${outputPath}`, (error, stdout, stderr) => {
        if (error) return reject(error);
        resolve();
      });
    });

    const uploadRes = await axios.post("https://file.io", fs.createReadStream(outputPath), {
      headers: { "Content-Type": "multipart/form-data" },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    // Rensa temporära filer
    fs.rmSync(tempFolder, { recursive: true, force: true });

    res.json({ success: true, downloadUrl: uploadRes.data.link || "Uploaded." });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error.");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
