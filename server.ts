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

  // Priority 3: List of extraction APIs (Public proxy scrapers)
  const extractors = [
    `https://api.vytub.com/info?url=${encodeURIComponent(url as string)}`,
    `https://api.song.icu/stream?id=${videoId}`,
    `https://pipedapi.kavin.rocks/streams/${videoId}`,
    `https://pipedapi.recloudstream.com/streams/${videoId}`,
    `https://pipedapi.darkness.services/streams/${videoId}`,
    `https://pipedapi.piv.to/streams/${videoId}`,
    `https://pipedapi.lunar.icu/streams/${videoId}`,
    `https://pipedapi.mha.fi/streams/${videoId}`,
    `https://pipedapi.qt.re/streams/${videoId}`,
    `https://invidious.projectsegfau.lt/api/v1/videos/${videoId}`,
    `https://invidious.nerdvpn.de/api/v1/videos/${videoId}`,
    `https://iv.ggtyler.dev/api/v1/videos/${videoId}`,
    `https://invidious.lunar.icu/api/v1/videos/${videoId}`,
    `https://invidious.flokinet.to/api/v1/videos/${videoId}`,
    `https://inv.tux.pizza/api/v1/videos/${videoId}`,
    `https://invidious.backingthe.me/api/v1/videos/${videoId}`,
    `https://api-faa.my.id/faa/youtube/play?url=${encodeURIComponent(url as string)}`,
    `https://api.cobalt.tools/api/json`,
    `https://yt.lemnoslife.com/videos?id=${videoId}&part=playback&stream=true`
  ];

  for (const apiUrl of extractors) {
    try {
      let streamUrl = null;
      
      if (apiUrl.includes("cobalt")) {
        try {
          const cobaltRes = await axios.post(apiUrl, {
            url: `https://www.youtube.com/watch?v=${videoId}`,
            audioFormat: "mp3",
            downloadMode: "audio"
          }, { 
            headers: { 
              "Accept": "application/json", 
              "Content-Type": "application/json",
              "User-Agent": "Mozilla/5.0"
            },
            timeout: 6000 
          });
          if (cobaltRes.data?.url) streamUrl = cobaltRes.data.url;
          else if (cobaltRes.data?.status === "stream" && cobaltRes.data.url) streamUrl = cobaltRes.data.url;
        } catch (e) { continue; }
      } else if (apiUrl.includes("pipedapi") || apiUrl.includes("invidious") || apiUrl.includes("yewtu.be") || apiUrl.includes("ggtyler") || apiUrl.includes("sethforprivacy") || apiUrl.includes("nerdvpn") || apiUrl.includes("projectsegfau") || apiUrl.includes("piv.to") || apiUrl.includes("lunar.icu") || apiUrl.includes("berrytube") || apiUrl.includes("flokinet") || apiUrl.includes("tux.pizza") || apiUrl.includes("backingthe.me") || apiUrl.includes("mha.fi") || apiUrl.includes("qt.re")) {
        const pipedRes = await axios.get(apiUrl, { timeout: 6000 });
        const data = pipedRes.data;
        // Check for audio streams first (Piped style)
        streamUrl = data.audioStreams?.find((s: any) => s.bitrate > 0)?.url 
                 || data.audioStreams?.[0]?.url;

        // If not found, check Invidious style
        if (!streamUrl && data.adaptiveFormats) {
           streamUrl = data.adaptiveFormats?.find((f: any) => f.type?.includes("audio") || f.mimeType?.includes("audio"))?.url
                    || data.adaptiveFormats?.find((f: any) => f.container === "m4a")?.url;
        }

        // Final fallbacks for both
        if (!streamUrl) {
           streamUrl = data.formatStreams?.[0]?.url 
                    || data.formatStreams?.find((s: any) => s.quality === "tiny")?.url
                    || data.formatStreams?.find((s: any) => s.type?.includes("audio"))?.url;
        }
      } else {
        const response = await axios.get(apiUrl, { timeout: 10000 });
        const result = response.data;
        
        if (result.status && result.result?.audio) streamUrl = result.result.audio;
        else if (result.formats?.find((f: any) => f.audioQuality || f.quality === "tiny" || f.type?.includes("audio"))) {
           const format = result.formats.find((f: any) => f.audioQuality) 
                       || result.formats.find((f: any) => f.type?.includes("audio"))
                       || result.formats.find((f: any) => f.quality === "tiny");
           streamUrl = format.url;
        }
        else if (result.audio_url) streamUrl = result.audio_url;
        else if (result.link) streamUrl = result.link;
        else if (result.stream) streamUrl = result.stream;
      }

      if (streamUrl) {
        return res.json({ status: true, result: { audio: streamUrl } });
      }
    } catch (e) {
      console.warn(`Extractor failed: ${apiUrl.split('/')[2]}`);
    }
  }

  // Final desperate attempt: try another public API
  try {
     const res2 = await axios.get(`https://api.vytub.com/info?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`, { timeout: 5000 });
     if (res2.data?.formats?.find((f: any) => f.url)) {
        return res.json({ status: true, result: { audio: res2.data.formats.find((f: any) => f.url).url } });
     }
  } catch (e) {}

  res.status(500).json({ error: "Source occupied. Please try another track or wait a moment." });
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
