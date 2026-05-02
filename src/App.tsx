import React, { useState, useEffect } from "react";
import { Search, Download, Music, Video, Loader2, Play, ArrowRight, ExternalLink, Info, Clock, Eye, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DownloadLinks { mp4: string | null; audio: string | null; }
interface VideoResult { title: string; channel: string; views: string; thumbnail: string; url: string; duration: string | null; download?: DownloadLinks; }

async function fetchJsonSafe(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  try {
    return { ok: res.ok, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, data: null };
  }
}

export default function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoResult | null>(null);
  const [fetchingLinks, setFetchingLinks] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"search" | "history">("search");
  const [currentTrack, setCurrentTrack] = useState<VideoResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);

  useEffect(() => { const saved = localStorage.getItem("ytstream_recent"); if (saved) setRecentSearches(JSON.parse(saved)); }, []);
  const saveSearch = (q: string) => { const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 5); setRecentSearches(updated); localStorage.setItem("ytstream_recent", JSON.stringify(updated)); };

  const handleSearch = async (e?: React.FormEvent, directQuery?: string) => {
    if (e) e.preventDefault();
    const searchQuery = directQuery || query;
    if (!searchQuery.trim()) return;
    setLoading(true); setResults([]); setActiveTab("search"); if (!directQuery) saveSearch(searchQuery);
    try {
      const primary = await fetchJsonSafe(`/api/search?query=${encodeURIComponent(searchQuery)}`);
      let data = primary.data;
      if (!primary.ok || !data) {
        const fallback = await fetchJsonSafe(`https://api-faa.my.id/faa/youtube?q=${encodeURIComponent(searchQuery)}`);
        data = fallback.data;
      }
      const list = Array.isArray(data) ? data : (data?.result || []);
      if (list.length > 0) {
        setResults(list.map((v: any) => ({ title: v.title || v.name, channel: v.channel || v.author || v.publisher, views: v.views || v.viewCount || "N/A", thumbnail: v.thumbnail || v.imageUrl || v.image, url: v.url || v.link, duration: v.duration || v.timestamp || null })));
      } else {
        const ytResponse = await fetchJsonSafe("/api/ytplay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: searchQuery }) });
        const ytData = ytResponse.data; if (ytData?.status && ytData.result) setResults([ytData.result]);
      }
    } catch (err) { console.error("Search failed:", err); } finally { setLoading(false); }
  };

  const fetchDownloadLinks = async (video: VideoResult) => {
    setSelectedVideo(video); setFetchingLinks(true);
    try {
      const response = await fetchJsonSafe("/api/ytplay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: video.url }) });
      const data = response.data;
      if (data.status && data.result) {
        const updatedVideo = { ...video, download: data.result.download, duration: data.result.duration || video.duration };
        setSelectedVideo(updatedVideo); if (currentTrack?.url === video.url) setCurrentTrack(updatedVideo);
      }
    } catch (err) { console.error("Link fetch failed:", err); } finally { setFetchingLinks(false); }
  };

  const playTrack = (video: VideoResult) => { if (!video.download?.audio) return; setCurrentTrack(video); setIsPlaying(true); setSelectedVideo(null); };

  return <div className="min-h-screen bg-bg-dark text-gray-100 flex flex-col pb-32"><header className="p-6 md:px-12 flex flex-col md:flex-row items-center gap-6 border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50"><div className="flex items-center gap-3 self-start md:self-center"><div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-primary via-brand-secondary to-brand-accent flex items-center justify-center"><Music className="text-white w-7 h-7" /></div><div><h1 className="text-2xl font-bold">name-<span className="text-green-400">music</span></h1></div></div><form onSubmit={handleSearch} className="flex-1 w-full max-w-2xl relative group"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" /><input type="text" placeholder="Artist, song, or video link..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6" /></form><button className="p-3 rounded-2xl"><Info className="w-5 h-5 text-gray-400" /></button></header><main className="flex-1 container mx-auto px-6 py-12 max-w-7xl z-10"><AnimatePresence mode="wait">{loading ? <div className="py-20"><Loader2 className="w-10 h-10 animate-spin" /></div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">{results.map((video, idx) => <motion.div key={idx} className="glass-card rounded-[2rem] overflow-hidden group p-3" onClick={() => fetchDownloadLinks(video)}><img src={video.thumbnail} alt={video.title} className="w-full aspect-[4/3] object-cover rounded-2xl" /><div className="p-3"><h3 className="font-bold line-clamp-1">{video.title}</h3><p className="text-xs text-gray-400">{video.channel}</p></div></motion.div>)}</div>}</AnimatePresence></main><AnimatePresence>{selectedVideo && <div className="fixed inset-0 z-[100] flex items-center justify-center p-6"><motion.div className="absolute inset-0 bg-black/80" onClick={() => setSelectedVideo(null)} /><motion.div className="relative w-full max-w-3xl bg-[#111] rounded-3xl p-8"><button onClick={() => setSelectedVideo(null)} className="absolute top-4 right-4"><X /></button>{fetchingLinks ? <Loader2 className="animate-spin" /> : <div className="space-y-4"><button onClick={() => playTrack(selectedVideo)} className="w-full p-4 rounded-2xl bg-brand-primary/20 flex items-center justify-between"><span>Listen Now</span><Play className="fill-white" /></button>{selectedVideo.download?.audio && <a href={selectedVideo.download.audio} download className="w-full block p-4 rounded-2xl bg-white/10">Download MP3</a>}</div>}</motion.div></div>}</AnimatePresence><AnimatePresence>{currentTrack && currentTrack.download?.audio && <motion.div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl z-[150]"><div className="bg-black/70 p-4 rounded-3xl flex items-center gap-4"><img src={currentTrack.thumbnail} className="w-12 h-12 rounded-xl" /><div className="flex-1"><h4 className="font-bold text-sm truncate">{currentTrack.title}</h4><p className="text-xs text-gray-400">{currentTrack.channel}</p></div><audio autoPlay={isPlaying} src={currentTrack.download.audio} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} ref={(el)=>{ if(el){ el.volume=volume; if(isPlaying) el.play().catch(()=>setIsPlaying(false)); else el.pause(); }}} className="hidden" /><button onClick={()=>setIsPlaying(!isPlaying)} className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center">{isPlaying ? <X className="w-4 h-4"/> : <Play className="w-4 h-4 fill-black"/>}</button><button onClick={()=>setCurrentTrack(null)} className="p-2"><X className="w-4 h-4"/></button></div></motion.div>}</AnimatePresence></div>;
}
