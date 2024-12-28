import express from 'express';
import WebTorrent from 'webtorrent';
import http from 'http';

const app = express();
const client = new WebTorrent();

app.use(express.json());

app.post('/stream', (req, res) => {
  const magnetLink = req.body.magnet;

  if (!magnetLink) {
    return res.status(400).send('Magnet link is required.');
  }

  client.add(magnetLink, (torrent) => {
    console.log(`Downloading: ${torrent.name}`);

    const file = torrent.files.find((file) => file.name.endsWith('.mp4'));
    if (!file) {
      return res.status(404).send('No MP4 file found in torrent.');
    }

    const server = http.createServer((req, res) => {
      const range = req.headers.range;
      if (!range) {
        res.status(400).send('Requires Range header');
        return;
      }

      const fileSize = file.length;
      const CHUNK_SIZE = 10 ** 6; // 1MB
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + CHUNK_SIZE, fileSize - 1);

      const headers = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': 'video/mp4',
      };

      res.writeHead(206, headers);
      const stream = file.createReadStream({ start, end });
      stream.pipe(res);

      stream.on('error', (err) => {
        console.error('Stream error:', err);
        res.end();
      });
    });

    server.listen(8000, () => {
      console.log(`Stream available at http://localhost:8000/${encodeURIComponent(file.name)}`);
      res.json({ streamUrl: `http://localhost:8000/${encodeURIComponent(file.name)}` });
    });

    torrent.on('done', () => {
      console.log('Download complete.');
    });
  });
});

app.listen(3000, '0.0.0.0', () => {
  console.log('WebTorrent server running on http://localhost:3000');
});
