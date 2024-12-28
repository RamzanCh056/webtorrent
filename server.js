const express = require('express');
const cors = require('cors');
const WebTorrent = require('webtorrent');

const app = express();
app.use(cors());
app.use(express.json());

const client = new WebTorrent();

app.post('/stream', (req, res) => {
  const magnet = req.body.magnet;
  if (!magnet) {
    return res.status(400).send({ error: 'Magnet link is required' });
  }

  client.add(magnet, (torrent) => {
    const file = torrent.files.find((file) => file.name.endsWith('.mp4'));
    if (!file) {
      return res.status(400).send({ error: 'No MP4 file found in torrent' });
    }

    res.send({ streamUrl: `https://webtorrent-fds8.onrender.com/${file.name}` });

    file.createReadStream().pipe(res);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`WebTorrent server running on port ${PORT}`);
});
