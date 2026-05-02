const axios = require('axios');
module.exports = async (req, res) => {
  const q = String(req.query.q || '');
  if (!q) return res.status(400).json({ status: false, error: 'Query required' });
  try {
    const response = await axios.get(`https://api-faa.my.id/faa/youtube?q=${encodeURIComponent(q)}`, { timeout: 15000 });
    const first = response?.data?.result?.[0];
    if (!first?.link) return res.status(404).json({ status: false, error: 'No result' });
    return res.json({ status: true, result: { title: first.title, channel: first.channel, thumbnail: first.imageUrl, url: first.link, download: { audio: null } } });
  } catch {
    return res.status(500).json({ status: false, error: 'Search failed' });
  }
};
