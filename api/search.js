const axios = require('axios');
module.exports = async (req, res) => {
  const query = String(req.query.query || '');
  if (!query) return res.status(400).json({ error: 'Query is required' });
  try {
    const { data } = await axios.get(`https://api-faa.my.id/faa/youtube?q=${encodeURIComponent(query)}`);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Search failed' });
  }
};
