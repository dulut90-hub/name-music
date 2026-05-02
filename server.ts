import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import axios from "axios";
import crypto from "crypto";

const app = express();
const PORT = 3000;

app.use(express.json());

const BASE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

const axiosClient = axios.create({
  timeout: 10000,
  headers: BASE_HEADERS,
});

function extractJson(html: string, varName: string) {
  try {
    const regex = new RegExp(`${varName}\\s*=\\s*(\\{[\\s\\S]*?\\});`, "s");
    const match = html.match(regex);
    if (match?.[1]) return JSON.parse(match[1]);
    
    const regex2 = new RegExp(`window\\["${varName}"\\]\\s*=\\s*(\\{[\\s\\S]*?\\});`, "s");
    const match2 = html.match(regex2);
    if (match2?.[1]) return JSON.parse(match2[1]);

    const regex3 = new RegExp(`var ${varName}\\s*=\\s*(\\{[\\s\\S]*?\\});`, "s");
    const match3 = html.match(regex3);
    if (match3?.[1]) return JSON.parse(match3[1]);

    return null;
  } catch (e) {
    console.error("JSON extraction error:", e);
    return null;
  }
}

function safeText(obj: any) {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  if (obj.simpleText) return obj.simpleText;
  if (obj.runs) return obj.runs.map((v: any) => v.text).join("");
  return "";
}

async function searchVideos(query: string) {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " music official")}&sp=EgIQAQ%253D%253D`;
    const { data: html } = await axiosClient.get(url, {
      headers: { ...BASE_HEADERS, "Cookie": "PREF=hl=en;" },
      timeout: 10000
    });

    const data = extractJson(html, "ytInitialData");
    
    const results: any[] = [];
    
    // Helper to extract video info from a renderer
    const parseVideo = (video: any) => {
      if (!video) return null;
      const title = safeText(video.title);
      if (!title || title.toLowerCase().includes("mix -")) return null;
      
      return {
        id: video.videoId,
        title: title,
        artist: safeText(video.ownerText) || safeText(video.longBylineText) || "Various Artists",
        duration: safeText(video.lengthText) || "0:00",
        thumbnail: video.thumbnail?.thumbnails?.at(-1)?.url || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
        url: `https://youtube.com/watch?v=${video.videoId}`
      };
    };

    // Strategy 1: Standard path
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents 
                  || data?.contents?.sectionListRenderer?.contents
                  || [];

    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const parsed = parseVideo(item.videoRenderer);
        if (parsed) results.push(parsed);
      }
    }

    // Strategy 2: Deep search if Strategy 1 found nothing
    if (results.length === 0) {
      const findVideos = (obj: any): any[] => {
        let vids: any[] = [];
        if (!obj || typeof obj !== 'object') return vids;
        if (obj.videoRenderer) vids.push(obj.videoRenderer);
        for (const key in obj) {
          if (typeof obj[key] === 'object') vids = [...vids, ...findVideos(obj[key])];
        }
        return vids;
      };
      
      const allVideos = findVideos(data);
      for (const video of allVideos) {
        const parsed = parseVideo(video);
        if (parsed) results.push(parsed);
      }
    }

    return results.slice(0, 50);
  } catch (error) {
    console.error("Scraping failed:", error);
    return [];
  }
}

app.get("/api/search", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Query required" });
  try {
    let results = await searchVideos(q as string);
    
    // If scraping returns nothing, try fallback APIs
    if (results.length < 5) {
       try {
         const fallback = await axios.get(`https://api-faa.my.id/faa/youtube?q=${encodeURIComponent(q as string)}`, { timeout: 8000 });
         if (fallback.data?.status && Array.isArray(fallback.data.result)) {
           results = [...results, ...fallback.data.result];
         }
       } catch (err) {
         console.warn("Fallback search failed");
       }
    }
    
    // De-duplicate
    const unique = Array.from(new Map(results.map(item => [item.id, item])).values());
    res.json({ status: true, result: unique });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

async function getDownloadSavetube(url: string) {
  try {
    const patterns = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/
    ];

    const id = patterns.find(p => p.test(url))?.exec(url)?.[1];
    if (!id) return null;

    const api = axios.create({
      headers: {
        "content-type": "application/json",
        origin: "https://yt.savetube.me",
        "user-agent": "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36"
      }
    });

    const randomCdnRes = await api.get("https://media.savetube.vip/api/random-cdn");
    const cdn = randomCdnRes.data?.cdn;
    if (!cdn) return null;

    const infoRes = await api.post(`https://${cdn}/v2/info`, { url });
    const encryptedData = infoRes.data?.data;
    if (!encryptedData) return null;

    const encrypted = Buffer.from(encryptedData, "base64");
    const decipher = crypto.createDecipheriv("aes-128-cbc",
      Buffer.from("C5D58EF67A7584E4A29F6C35BBC4EB12", "hex"),
      encrypted.slice(0, 16)
    );

    const decrypted = JSON.parse(
      Buffer.concat([
        decipher.update(encrypted.slice(16)),
        decipher.final()
      ]).toString()
    );

    const downloadRes = await api.post(`https://${cdn}/download`, {
      id,
      downloadType: "audio",
      quality: "128",
      key: decrypted?.key
    });

    const downloadUrl = downloadRes.data?.data?.downloadUrl;
    return typeof downloadUrl === "string" && downloadUrl.length > 0 ? downloadUrl : null;
  } catch (err) {
    console.error("Savetube failed:", err);
    return null;
  }
}

async function ytdlRapid(url: string) {
  try {
    const patterns = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/
    ];

    const id = patterns.find(p => p.test(url))?.exec(url)?.[1];
    if (!id) return null;

    const { data } = await axios.get(
      `https://ytstream-download-youtube-videos.p.rapidapi.com/dl?id=${id}`,
      {
        headers: {
          "x-rapidapi-host": "ytstream-download-youtube-videos.p.rapidapi.com",
          "x-rapidapi-key": "6fabfe3ba0msha10853256d5c5f9p1c1247jsnf1625ea46cb6"
        },
        timeout: 10000
      }
    );

    return data?.link || data?.formats?.[0]?.url || data?.audioUrl || null;
  } catch {
    return null;
  }
}


async function searchFirstVideo(query: string) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const { data: html } = await axiosClient.get(url);
  const data = extractJson(html, "ytInitialData");
  if (!data) throw new Error("ytInitialData not found");

  const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
  let video: any = null;

  for (const section of sections) {
    const items = section?.itemSectionRenderer?.contents || [];
    video = items.find((x: any) => x.videoRenderer)?.videoRenderer;
    if (video) break;
  }

  if (!video) throw new Error("No video found");

  return {
    videoId: video.videoId,
    title: safeText(video.title),
    channel: safeText(video.ownerText) || safeText(video.longBylineText),
    views: safeText(video.viewCountText) || safeText(video.shortViewCountText),
    thumbnail: video.thumbnail?.thumbnails?.at(-1)?.url || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`
  };
}

app.get('/api/ytplay', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ status: false, error: 'Query required' });
  try {
    const meta = await searchFirstVideo(q as string);
    const watchUrl = `https://www.youtube.com/watch?v=${meta.videoId}`;
    const saveAudio = await getDownloadSavetube(watchUrl);
    const rapid = await ytdlRapid(watchUrl);
    const audio = saveAudio || rapid || null;

    return res.json({
      status: true,
      result: {
        title: meta.title,
        channel: meta.channel,
        views: meta.views,
        thumbnail: meta.thumbnail,
        url: watchUrl,
        download: { audio }
      }
    });
  } catch (e: any) {
    return res.status(500).json({ status: false, error: e.message || 'ytplay failed' });
  }
});
app.get("/api/play", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL required" });
  
  const videoId = (url as string).match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)?.[1] || (url as string).split('v=')[1]?.split('&')[0];
  
  if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

  // Priority 1: High reliability savetube
  const saveUrl = await getDownloadSavetube(url as string);
  if (saveUrl) {
    return res.json({ status: true, result: { audio: saveUrl } });
  }

  // Priority 2: RapidAPI fallback
  const rapidUrl = await ytdlRapid(url as string);
  if (rapidUrl) {
    return res.json({ status: true, result: { audio: rapidUrl } });
  }

  return res.status(500).json({ error: "Server extraction failed" });
});

async function startServer() {
  const distPath = path.join(process.cwd(), "dist");
  const hasDistBuild = fs.existsSync(path.join(distPath, "index.html"));
  const useViteMiddleware = process.env.NODE_ENV !== "production" || !hasDistBuild;

  if (useViteMiddleware) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
}

startServer();
