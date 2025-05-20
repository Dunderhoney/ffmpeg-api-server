const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('FFmpeg merge server is running!');
});

app.post('/merge', async (req, res) => {
  const urls = req.body.urls;

  console.log('Mottagna URLs:', urls);

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'No input videos provided.' });
  }

  res.json({ message: 'URLs mottagna korrekt', urls });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
