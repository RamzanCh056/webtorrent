const express = require('express');
const cors = require('cors');
const WebTorrent = require('webtorrent');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize WebTorrent client
const client = new WebTorrent();

// POST endpoint for streaming
app.post('/stream', (req, res) => {
  const magnet = req.body.magnet;

  if (!magnet) {
    return res.status(400).send({ error: 'Magnet link is required' });
  }

  try {
    client.add(magnet, (torrent) => {
      const file = torrent.files.find((file) => file.name.endsWith('.mp4'));

      if (!file) {
        return res.status(400).send({ error: 'No MP4 file found in torrent' });
      }

      // Construct the stream URL
      res.send({ streamUrl: `https://webtorrent-fds8.onrender.com/${file.name}` });

      // Serve the file
      app.get(`/${file.name}`, (req, res) => {
        const range = req.headers.range;

        if (!range) {
          return res.status(400).send('Requires Range header');
        }

        const positions = range.replace(/bytes=/, '').split('-');
        const start = parseInt(positions[0], 10);
        const fileSize = file.length;
        const end = positions[1] ? parseInt(positions[1], 10) : fileSize - 1;

        const chunkSize = end - start + 1;
        const headers = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': 'video/mp4',
        };

        res.writeHead(206, headers);

        const stream = file.createReadStream({ start, end });
        stream.pipe(res);
        stream.on('error', (err) => {
          console.error('Stream error:', err.message);
          res.sendStatus(500);
        });
      });
    });
  } catch (error) {
    console.error('Error adding torrent:', error.message);
    res.status(500).send({ error: 'Failed to add torrent' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`WebTorrent server running on port ${PORT}`);
});
