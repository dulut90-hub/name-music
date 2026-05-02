const axios = require('axios');

function safeText(obj){ if(!obj) return ''; if(typeof obj==='string') return obj; if(obj.simpleText) return obj.simpleText; if(obj.runs) return obj.runs.map(v=>v.text).join(''); return ''; }
function extractJson(html,varName){ const m = html.match(new RegExp(`var ${varName}\s*=\s*(\{[\s\S]*?\});`, 's')); if(!m?.[1]) return null; try{return JSON.parse(m[1]);}catch{return null;} }

async function scrapeYoutube(query){
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const { data: html } = await axios.get(url, { timeout: 15000, headers: { 'User-Agent':'Mozilla/5.0' } });
  const data = extractJson(html, 'ytInitialData');
  const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
  const out=[];
  for(const section of sections){
    const items=section?.itemSectionRenderer?.contents || [];
    for(const item of items){
      const v=item.videoRenderer; if(!v) continue;
      out.push({ title:safeText(v.title), channel:safeText(v.ownerText)||safeText(v.longBylineText), duration:safeText(v.lengthText)||null, imageUrl:v.thumbnail?.thumbnails?.at(-1)?.url, link:`https://youtube.com/watch?v=${v.videoId}` });
    }
  }
  return out;
}

module.exports = async (req, res) => {
  const query = String(req.query.query || '');
  if (!query) return res.status(400).json({ status:false, error:'Query is required', result:[] });
  try {
    const { data } = await axios.get(`https://api-faa.my.id/faa/youtube?q=${encodeURIComponent(query)}`, { timeout: 12000 });
    if (Array.isArray(data?.result) && data.result.length) return res.json(data);
  } catch {}

  try {
    const result = await scrapeYoutube(query);
    return res.json({ status:true, result });
  } catch (e) {
    return res.status(200).json({ status:false, error:'Search failed', result:[] });
  }
};
