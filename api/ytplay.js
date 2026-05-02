const axios = require('axios');
const play = require('./play');

module.exports = async (req, res) => {
  const query = String((req.body && req.body.query) || req.query.q || '');
  if (!query) return res.status(400).json({ status:false, error:'Query required' });
  try {
    const response = await axios.get(`https://api-faa.my.id/faa/youtube?q=${encodeURIComponent(query)}`, { timeout: 12000 });
    const first = response?.data?.result?.[0];
    if (!first?.link) return res.status(200).json({ status:false, error:'No result' });

    let audio = null;
    const fakeReq = { query: { url: first.link } };
    const fakeRes = { status: () => fakeRes, json: (obj) => { audio = obj?.result?.audio || null; return obj; } };
    await play(fakeReq, fakeRes);

    return res.json({ status:true, result:{ title:first.title, channel:first.channel, thumbnail:first.imageUrl, views:'N/A', url:first.link, duration:first.duration||null, download:{ audio, mp4:null } } });
  } catch {
    return res.status(200).json({ status:false, error:'ytplay failed' });
  }
};
