const axios = require('axios');
const crypto = require('crypto');

function extractId(url) {
  const patterns = [/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,/youtu\.be\/([a-zA-Z0-9_-]{11})/];
  const m = patterns.map(p=>url.match(p)).find(Boolean);
  return m ? m[1] : null;
}

async function getDownload(url) {
  const id = extractId(url);
  if (!id) return null;
  const api = axios.create({ headers: { 'content-type': 'application/json', origin: 'https://yt.savetube.me', 'user-agent': 'Mozilla/5.0' }});
  const { data: { cdn } } = await api.get('https://media.savetube.vip/api/random-cdn');
  const { data: { data: encryptedData } } = await api.post(`https://${cdn}/v2/info`, { url });
  const encrypted = Buffer.from(encryptedData, 'base64');
  const decipher = crypto.createDecipheriv('aes-128-cbc', Buffer.from('C5D58EF67A7584E4A29F6C35BBC4EB12', 'hex'), encrypted.slice(0,16));
  const decrypted = JSON.parse(Buffer.concat([decipher.update(encrypted.slice(16)), decipher.final()]).toString());
  const { data: { data: { downloadUrl } } } = await api.post(`https://${cdn}/download`, { id, downloadType: 'audio', quality: '128', key: decrypted.key });
  return downloadUrl || null;
}

module.exports = async (req, res) => {
  const url = String(req.query.url || '');
  if (!url) return res.status(400).json({ status: false, error: 'URL required' });
  try {
    const audio = await getDownload(url);
    if (!audio) return res.status(500).json({ status: false, error: 'Server extraction failed' });
    return res.json({ status: true, result: { audio } });
  } catch {
    return res.status(500).json({ status: false, error: 'Server extraction failed' });
  }
};
