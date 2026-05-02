import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Home, 
  Library, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Repeat, 
  Shuffle, 
  Volume2, 
  Heart, 
  Clock, 
  MoreHorizontal, 
  Plus, 
  Search as SearchIcon,
  X,
  Globe,
  Settings,
  ChevronDown,
  LayoutGrid,
  Music,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMusic, MusicProvider } from './lib/audio';
import { Track } from './types';

// Translation strings
const translations = {
  id: {
    home: "Beranda",
    search: "Cari",
    library: "Koleksi Kamu",
    liked: "Lagu Disukai",
    history: "Baru Diputar",
    settings: "Pengaturan",
    playlists: "Playlist",
    no_results: "Tidak ada hasil ditemukan",
    search_placeholder: "Cari lagu atau artis...",
    language: "Bahasa",
    queue: "Antrean",
    add_to_playlist: "Tambah ke playlist",
    remove_from_liked: "Hapus dari disukai",
    add_to_liked: "Simpan ke disukai",
    playing_from: "Memutar dari",
    close: "Tutup"
  },
  ms: {
    home: "Utama",
    search: "Cari",
    library: "Koleksi Anda",
    liked: "Lagu Disukai",
    history: "Baru Dimainkan",
    settings: "Tetapan",
    playlists: "Senarai Main",
    no_results: "Tiada hasil dijumpai",
    search_placeholder: "Cari lagu atau artis...",
    language: "Bahasa",
    queue: "Giliran",
    add_to_playlist: "Tambah ke senarai main",
    remove_from_liked: "Buang dari disukai",
    add_to_liked: "Simpan ke disukai",
    playing_from: "Dimainkan dari",
    close: "Tutup"
  },
  en: {
    home: "Home",
    search: "Search",
    library: "Your Library",
    liked: "Liked Songs",
    history: "Recently Played",
    settings: "Settings",
    playlists: "Playlists",
    no_results: "No results found",
    search_placeholder: "Search for songs or artists...",
    language: "Language",
    queue: "Queue",
    add_to_playlist: "Add to playlist",
    remove_from_liked: "Remove from liked",
    add_to_liked: "Save to liked",
    playing_from: "Playing from",
    close: "Close"
  },
  es: {
    home: "Inicio",
    search: "Buscar",
    library: "Tu biblioteca",
    liked: "Canciones que te gustan",
    history: "Escuchado recientemente",
    settings: "Configuración",
    playlists: "Listas",
    no_results: "No se encontraron resultados",
    search_placeholder: "Buscar canciones o artistas...",
    language: "Idioma",
    queue: "Cola",
    add_to_playlist: "Añadir a lista",
    remove_from_liked: "Quitar de favoritos",
    add_to_liked: "Guardar en favoritos",
    playing_from: "Reproduciendo de",
    close: "Cerrar"
  },
  fr: {
    home: "Accueil",
    search: "Rechercher",
    library: "Bibliothèque",
    liked: "Titres likés",
    history: "Écoutés récemment",
    settings: "Paramètres",
    playlists: "Playlists",
    no_results: "Aucun résultat trouvé",
    search_placeholder: "Rechercher des chansons...",
    language: "Langue",
    queue: "File d'attente",
    add_to_playlist: "Ajouter à la playlist",
    remove_from_liked: "Supprimer des favoris",
    add_to_liked: "Ajouter aux favoris",
    playing_from: "Lecture depuis",
    close: "Fermer"
  },
  de: {
    home: "Startseite",
    search: "Suche",
    library: "Bibliothek",
    liked: "Lieblingssongs",
    history: "Zuletzt gehört",
    settings: "Einstellungen",
    playlists: "Playlists",
    no_results: "Keine Ergebnisse gefunden",
    search_placeholder: "Suche nach Songs...",
    language: "Sprache",
    queue: "Warteschlange",
    add_to_playlist: "Zur Playlist hinzufügen",
    remove_from_liked: "Von Lieblingssongs entfernen",
    add_to_liked: "Zu Lieblingssongs hinzufügen",
    playing_from: "Wiedergabe von",
    close: "Schließen"
  },
  ja: {
    home: "ホーム",
    search: "検索",
    library: "マイライブラリ",
    liked: "お気に入りの曲",
    history: "最近再生した曲",
    settings: "設定",
    playlists: "プレイリスト",
    no_results: "結果が見つかりませんでした",
    search_placeholder: "曲やアーティストを検索...",
    language: "言語",
    queue: "次に再生",
    add_to_playlist: "プレイリストに追加",
    remove_from_liked: "お気に入りから削除",
    add_to_liked: "お気に入りに追加",
    playing_from: "再生中:",
    close: "閉じる"
  },
  ko: {
    home: "홈",
    search: "검색",
    library: "내 라이브러리",
    liked: "좋아요 표시한 곡",
    history: "최근 재생한 항목",
    settings: "설정",
    playlists: "플레이리스트",
    no_results: "결과를 찾을 수 없습니다",
    search_placeholder: "곡 또는 아티스트 검색...",
    language: "언어",
    queue: "대기열",
    add_to_playlist: "플레이리스트에 추가",
    remove_from_liked: "좋아요 취소",
    add_to_liked: "좋아요 추가",
    playing_from: "재생 중:",
    close: "닫기"
  },
  zh: {
    home: "首页",
    search: "搜索",
    library: "你的媒体库",
    liked: "喜欢的歌曲",
    history: "最近播放",
    settings: "设置",
    playlists: "播放列表",
    no_results: "没有找到结果",
    search_placeholder: "搜索歌曲或艺人...",
    language: "语言",
    queue: "播放队列",
    add_to_playlist: "添加到播放列表",
    remove_from_liked: "从喜欢的歌曲中移除",
    add_to_liked: "保存到喜欢的歌曲",
    playing_from: "正在播放:",
    close: "关闭"
  },
  th: {
    home: "หน้าหลัก",
    search: "ค้นหา",
    library: "คลังของคุณ",
    liked: "เพลงที่ถูกใจ",
    history: "ฟังล่าสุด",
    settings: "การตั้งค่า",
    playlists: "เพลย์ลิสต์",
    no_results: "ไม่พบผลลัพธ์",
    search_placeholder: "ค้นหาเพลงหรือศิลปิน...",
    language: "ภาษา",
    queue: "คิว",
    add_to_playlist: "เพิ่มในเพลย์ลิสต์",
    remove_from_liked: "ลบจากที่ถูกใจ",
    add_to_liked: "บันทึกในที่ถูกใจ",
    playing_from: "กำลังเล่นจาก",
    close: "ปิด"
  },
  vi: {
    home: "Trang chủ",
    search: "Tìm kiếm",
    library: "Thư viện",
    liked: "Bài hát đã thích",
    history: "Đã nghe gần đây",
    settings: "Cài đặt",
    playlists: "Danh sách phát",
    no_results: "Không tìm thấy kết quả",
    search_placeholder: "Tìm kiếm bài hát...",
    language: "Ngôn ngữ",
    queue: "Danh sách chờ",
    add_to_playlist: "Thêm vào danh sách phát",
    remove_from_liked: "Xóa khỏi mục yêu thích",
    add_to_liked: "Thêm vào mục yêu thích",
    playing_from: "Đang phát từ",
    close: "Đóng"
  },
  hi: {
    home: "होम",
    search: "खोजें",
    library: "आपकी लाइब्रेरी",
    liked: "पसंद किए गए गाने",
    history: "हाल ही में बजाए गए",
    settings: "सेटिंग्स",
    playlists: "प्लेलिस्ट",
    no_results: "कोई परिणाम नहीं मिला",
    search_placeholder: "गाने या कलाकार खोजें...",
    language: "भाषा",
    queue: "कतार",
    add_to_playlist: "प्लेलिस्ट में जोड़ें",
    remove_from_liked: "पसंद से हटाएं",
    add_to_liked: "पसंद में जोड़ें",
    playing_from: "यहाँ से बज रहा है",
    close: "बंद करें"
  }
};


const STORAGE_PREFIX = 'name-music';
const storageKey = (key: string) => `${STORAGE_PREFIX}:${key}`;
const SEARCH_ENDPOINTS = ['https://api-faa.my.id/faa/youtube'];

async function fetchJsonSafe(url: string) {
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON response from server');
  }
}


function normalizeTrack(item: any): Track | null {
  const url = item.url || item.link;
  const id = item.id || (typeof url === 'string' ? (url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || url) : null);
  if (!id || !url) return null;
  return {
    id,
    title: item.title || 'Unknown Title',
    artist: item.artist || item.channel || 'Unknown Artist',
    thumbnail: item.thumbnail || item.imageUrl || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    url,
    duration: item.duration || '0:00',
    audioUrl: item.audioUrl || undefined,
  };
}

async function searchTracks(query: string): Promise<Track[]> {
  for (const base of SEARCH_ENDPOINTS) {
    try {
      const glue = base.includes('?') ? '&' : '?';
      const data = await fetchJsonSafe(`${base}${glue}q=${encodeURIComponent(query)}`);
      if (!data?.status || !Array.isArray(data.result)) continue;
      const normalized = data.result.map(normalizeTrack).filter(Boolean) as Track[];
      if (normalized.length > 0) return normalized;
    } catch (e) {
      console.warn(`Search endpoint failed: ${base}`, e);
    }
  }
  return [];
}

const languages = [
  { code: 'en', name: 'English' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'hi', name: 'Hindi' },
];

function AppContent() {
  const { 
    currentTrack, isPlaying, volume, progress, duration, 
    playTrack, togglePlay, nextTrack, prevTrack, setVolume, seek,
    repeatMode, isShuffle, setRepeatMode, toggleShuffle
  } = useMusic();

  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'library'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [trending, setTrending] = useState<Track[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const [lang, setLang] = useState<keyof typeof translations>(
    (localStorage.getItem(storageKey('lang')) as keyof typeof translations) || 'en'
  );

  useEffect(() => {
    const main = document.querySelector('main');
    const handleScroll = () => {
      if (main) setScrolled(main.scrollTop > 20);
    };
    main?.addEventListener('scroll', handleScroll);
    return () => main?.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Load trending music on mount with multiple attempts
    const fetchTrending = async () => {
      const queries = ['trending music 2024', 'top hits global', 'popular songs 2025'];
      for (const query of queries) {
        try {
          const result = await searchTracks(query);
          if (result.length > 0) {
            setTrending(result);
            return;
          }
        } catch (e) {
          console.error(`Failed to fetch trending for ${query}`, e);
        }
      }
    };
    fetchTrending();
  }, []);
  
  const [likedSongs, setLikedSongs] = useState<Track[]>(() => {
    return JSON.parse(localStorage.getItem(storageKey('likedSongs')) || '[]');
  });
  
  const [history, setHistory] = useState<Track[]>(() => {
    return JSON.parse(localStorage.getItem(storageKey('history')) || '[]');
  });

  const [isMobilePlayerOpen, setIsMobilePlayerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [liteMode, setLiteMode] = useState<boolean>(() => localStorage.getItem(storageKey('liteMode')) === '1');
  const trackGridClass = useMemo(() => liteMode ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6', [liteMode]);

  const t = translations[lang];

  useEffect(() => {
    localStorage.setItem(storageKey('lang'), lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem(storageKey('likedSongs'), JSON.stringify(likedSongs));
  }, [likedSongs]);

  useEffect(() => {
    localStorage.setItem(storageKey('history'), JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(storageKey('liteMode'), liteMode ? '1' : '0');
  }, [liteMode]);

  useEffect(() => {
    if (currentTrack && currentTrack.id) {
      setHistory(prev => {
        const filtered = prev.filter(t => t.id !== currentTrack.id);
        const newHistory = [currentTrack, ...filtered].slice(0, 50);
        return newHistory;
      });
    }
  }, [currentTrack?.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        handleSearch();
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setActiveTab('search');
    try {
      const result = await searchTracks(searchQuery);
      setSearchResults(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLike = (track: Track) => {
    setLikedSongs(prev => {
      const exists = prev.find(t => t.id === track.id);
      if (exists) return prev.filter(t => t.id !== track.id);
      return [...prev, track];
    });
  };

  const isLiked = (trackId: string) => likedSongs.some(t => t.id === trackId);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex overflow-x-hidden selection:bg-[#1DB954] selection:text-black">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }} 
        t={t} 
        likedCount={likedSongs.length} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        lang={lang}
        setLang={setLang}
      />

      {/* Main Content */}
      <main className="flex-1 min-w-0 relative h-screen overflow-y-auto scroll-smooth flex flex-col">
        <header className={`sticky top-0 z-40 transition-all duration-300 p-4 md:p-6 flex items-center justify-between ${
          scrolled ? 'bg-black/80 backdrop-blur-3xl border-b border-white/5' : 'bg-transparent'
        }`}>
             <div className="flex items-center gap-4 flex-1 max-w-xl">
               <button 
                 onClick={() => setIsSidebarOpen(true)}
                 className="p-2 -ml-2 text-gray-400 hover:text-white md:hidden"
               >
                 <Menu size={24} />
               </button>
               <form onSubmit={handleSearch} className="relative w-full group">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1DB954] transition-colors" size={20} />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.search_placeholder}
                    className="w-full bg-[#1a1a1a] hover:bg-[#242424] rounded-full py-3.5 pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1DB954]/20 transition-all border border-white/5"
                  />
               </form>
             </div>
             
             <div className="flex items-center gap-4 ml-4">
                <button onClick={() => setLiteMode(v => !v)} className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20">{liteMode ? 'Lite On' : 'Lite Off'}</button>
                <button 
                  onClick={() => setActiveTab('library')}
                  className="p-2 text-gray-400 hover:text-white transition md:hidden"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-black text-white shadow-lg">
                    {likedSongs.length}
                  </div>
                </button>
             </div>
          </header>

          <div className="p-6 md:p-10 max-w-7xl mx-auto w-full flex-1">
            <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                key="home"
                className="space-y-16"
              >
                <section>
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-2">Trending Now</h2>
                      <p className="text-sm font-medium text-gray-500">The most played tracks this week</p>
                    </div>
                  </div>
                  <div className={trackGridClass}>
                    {trending.length > 0 ? trending.slice(0, 12).map(track => (
                      <TrackCard 
                        key={track.id} 
                        track={track} 
                        onPlay={(t) => playTrack(t, trending)} 
                        onLike={() => toggleLike(track)} 
                        liked={isLiked(track.id)} 
                        active={currentTrack?.id === track.id} 
                      />
                    )) : Array.from({length: 6}).map((_, i) => (
                      <div key={i} className="space-y-4 animate-pulse">
                        <div className="aspect-square bg-white/[0.03] rounded-2xl" />
                        <div className="h-4 bg-white/[0.03] rounded-full w-3/4" />
                        <div className="h-3 bg-white/[0.03] rounded-full w-1/2 opacity-50" />
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                   <div className="flex items-center justify-between mb-8">
                      <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Browse Genres</h2>
                   </div>
                   <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { name: 'Pop Hits', color: 'from-pink-500 to-rose-500', query: 'pop music 2024' },
                        { name: 'Lo-Fi Chill', color: 'from-indigo-500 to-purple-500', query: 'lofi hip hop' },
                        { name: 'Rock Classics', color: 'from-orange-500 to-red-500', query: 'classic rock hits' },
                        { name: 'Electronic', color: 'from-cyan-500 to-blue-500', query: 'electronic dance music' }
                      ].map((genre) => (
                        <button
                          key={genre.name}
                          onClick={() => {
                            setSearchQuery(genre.query);
                            handleSearch();
                          }}
                          className={`h-32 rounded-2xl bg-gradient-to-br ${genre.color} p-6 flex flex-col justify-end text-left relative overflow-hidden group active:scale-95 transition-all`}
                        >
                          <div className="absolute top-2 right-2 opacity-10 group-hover:scale-125 transition-transform">
                             <LayoutGrid size={80} />
                          </div>
                          <span className="text-xl font-black">{genre.name}</span>
                        </button>
                      ))}
                   </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t.history}</h2>
                  </div>
                  <div className={trackGridClass}>
                    {history.length > 0 ? history.slice(0, 6).map(track => (
                      <TrackCard key={track.id} track={track} onPlay={(t) => playTrack(t, history)} onLike={() => toggleLike(track)} liked={isLiked(track.id)} active={currentTrack?.id === track.id} />
                    )) : (
                      <div className="col-span-full py-16 flex flex-col items-center justify-center text-gray-500 border border-white/[0.03] rounded-3xl bg-white/[0.01]">
                        <Clock size={48} className="mb-4 opacity-10" />
                        <span className="text-sm font-bold opacity-30 tracking-widest uppercase">No history yet</span>
                      </div>
                    )}
                  </div>
                </section>

                
                

                <section>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">Top Music Picks</h2>
                  <div className={trackGridClass}>
                    {likedSongs.length > 0 ? likedSongs.map(track => (
                      <TrackCard key={track.id} track={track} onPlay={playTrack} onLike={() => toggleLike(track)} liked={isLiked(track.id)} active={currentTrack?.id === track.id} />
                    )) : (
                      <div className="col-span-full py-16 text-center text-gray-500 bg-white/[0.03] rounded-2xl border border-white/5 shadow-inner">
                        <Heart size={48} className="mx-auto mb-4 opacity-10" />
                        <p className="font-medium opacity-40">Start searching to discover music!</p>
                      </div>
                    )}
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'search' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                key="search"
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold tracking-tight">{t.search}</h2>
                  {isLoading && <div className="w-6 h-6 border-4 border-[#1DB954] border-t-transparent animate-spin rounded-full" />}
                </div>
                
                <div className={trackGridClass}>
                  {searchResults.map(track => (
                    <TrackCard key={track.id} track={track} onPlay={(t) => playTrack(t, searchResults)} onLike={() => toggleLike(track)} liked={isLiked(track.id)} active={currentTrack?.id === track.id} />
                  ))}
                  {searchResults.length === 0 && !isLoading && !searchQuery && (
                     <div className="col-span-full py-32 flex flex-col items-center justify-center text-gray-500 gap-4">
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-4">
                           <SearchIcon size={48} className="opacity-20" />
                        </div>
                        <p className="text-xl font-bold opacity-40">What do you want to listen to?</p>
                        <p className="text-sm opacity-30">Search for artists, songs, or podcasts</p>
                     </div>
                  )}
                  {searchResults.length === 0 && !isLoading && searchQuery && (
                     <div className="col-span-full py-20 bg-[#181818]/40 rounded-3xl flex flex-col items-center gap-4 text-gray-400 border border-white/5">
                        <X size={48} className="opacity-20 text-red-500" />
                        <p className="font-bold text-lg">{t.no_results}</p>
                        <p className="text-sm opacity-50">Try searching for something else</p>
                     </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'library' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                key="library"
                className="space-y-10"
              >
                <div className="flex flex-col md:flex-row items-center md:items-end gap-8 mb-12">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="w-48 h-48 md:w-64 md:h-64 bg-gradient-to-br from-[#450af5] to-[#c4efd9] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center relative group"
                  >
                    <Heart size={80} fill="white" className="drop-shadow-2xl" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                  </motion.div>
                  <div className="flex flex-col text-center md:text-left gap-4">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#1DB954]">Playlist</p>
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none">{t.liked}</h1>
                    <div className="flex items-center justify-center md:justify-start gap-2 text-sm font-bold opacity-80 mt-2">
                       <div className="w-6 h-6 rounded-full bg-[#1DB954] flex items-center justify-center text-[10px] text-black">U</div>
                       <span>User Profile</span>
                       <span className="opacity-40">•</span>
                       <span>{likedSongs.length} songs</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#121212]/30 backdrop-blur-md rounded-3xl overflow-hidden border border-white/[0.03] shadow-2xl">
                   <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-white/5">
                         <th className="px-6 py-5 w-16 text-center">#</th>
                         <th className="px-6 py-5">Title</th>
                         <th className="px-6 py-5 hidden md:table-cell">Duration</th>
                         <th className="px-6 py-5 w-20 text-center">Action</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-white/[0.02]">
                       {likedSongs.map((track, i) => (
                         <tr 
                           key={track.id} 
                           className="group hover:bg-white/[0.04] transition-all cursor-pointer relative"
                           onClick={() => playTrack(track, likedSongs)}
                         >
                           <td className="px-6 py-5 text-gray-500 font-mono text-sm group-hover:text-[#1DB954] text-center transition-colors">
                             {currentTrack?.id === track.id && isPlaying ? (
                               <div className="flex items-center justify-center gap-1 h-4">
                                 <motion.div className="w-1 bg-[#1DB954]" animate={{ height: [8, 16, 10, 14, 8] }} transition={{ repeat: Infinity, duration: 1 }} />
                                 <motion.div className="w-1 bg-[#1DB954]" animate={{ height: [12, 8, 16, 10, 12] }} transition={{ repeat: Infinity, duration: 1.2 }} />
                                 <motion.div className="w-1 bg-[#1DB954]" animate={{ height: [6, 14, 8, 12, 6] }} transition={{ repeat: Infinity, duration: 0.8 }} />
                               </div>
                             ) : i + 1}
                           </td>
                           <td className="px-6 py-5">
                             <div className="flex items-center gap-4">
                               <div className="relative overflow-hidden rounded shadow-lg">
                                 <img src={track.thumbnail} className="w-12 h-12 object-cover group-hover:scale-110 transition-transform duration-500" />
                                 {currentTrack?.id === track.id && isPlaying && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Pause size={16} fill="white" /></div>}
                               </div>
                               <div className="flex flex-col min-w-0">
                                 <span className={`font-bold text-base truncate transition-colors ${currentTrack?.id === track.id ? 'text-[#1DB954]' : 'text-white'}`}>{track.title}</span>
                                 <span className="text-sm font-medium text-gray-400 truncate opacity-60 group-hover:opacity-100 transition-opacity tracking-wide">{track.artist}</span>
                               </div>
                             </div>
                           </td>
                           <td className="px-6 py-5 text-gray-400 text-sm hidden md:table-cell font-mono group-hover:text-white transition-colors opacity-60">{track.duration}</td>
                           <td className="px-6 py-5 text-center">
                              <button 
                                onClick={(e) => { e.stopPropagation(); toggleLike(track); }} 
                                className="text-[#1DB954] p-2 hover:bg-white/5 rounded-full transition-all hover:scale-110 active:scale-75"
                              >
                                <Heart size={18} fill="#1DB954" />
                              </button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                   {likedSongs.length === 0 && (
                     <div className="py-32 flex flex-col items-center justify-center gap-4 opacity-30 text-center px-8">
                       <Library size={64} />
                       <p className="text-xl font-bold">Your library is empty</p>
                       <p className="text-sm max-w-xs">Start searching for songs and click the heart icon to add them to your library.</p>
                     </div>
                   )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Player Bar - Desktop */}
      <footer className="fixed bottom-0 left-0 right-0 h-24 bg-black border-t border-white/10 px-6 z-50 hidden md:block">
        <div className="h-full max-w-screen-2xl mx-auto flex items-center justify-between">
          {/* Current Track Info */}
          <div className="flex items-center gap-4 w-1/3 min-w-0">
             {currentTrack ? (
               <>
                 <div className="relative group overflow-hidden rounded-md min-w-[56px] shadow-2xl">
                   <img src={currentTrack.thumbnail} className="w-14 h-14 object-cover" />
                 </div>
                 <div className="flex flex-col min-w-0 overflow-hidden">
                   <span className="font-bold text-sm truncate hover:underline cursor-pointer transition" onClick={() => setIsMobilePlayerOpen(true)}>{currentTrack.title}</span>
                   <span className="text-xs text-gray-400 truncate hover:underline cursor-pointer transition opacity-70" onClick={() => setIsMobilePlayerOpen(true)}>{currentTrack.artist}</span>
                 </div>
                 <button 
                  onClick={(e) => { e.stopPropagation(); toggleLike(currentTrack); }}
                  className={`${isLiked(currentTrack.id) ? 'text-[#1DB954]' : 'text-gray-400 hover:text-white'} ml-4 transition-all hover:scale-110 active:scale-90`}
                 >
                   <Heart size={20} fill={isLiked(currentTrack.id) ? 'currentColor' : 'none'} />
                 </button>
               </>
             ) : (
               <div className="flex items-center gap-4 opacity-10">
                 <div className="w-14 h-14 bg-gray-800 rounded-md" />
                 <div className="flex flex-col gap-2">
                   <div className="h-4 w-32 bg-gray-800 rounded" />
                   <div className="h-3 w-24 bg-gray-800 rounded" />
                 </div>
               </div>
             )}
          </div>

          {/* Player Controls */}
          <div className="flex flex-col items-center gap-3 w-1/3">
             <div className="flex items-center gap-6">
                <button 
                  onClick={toggleShuffle}
                  className={`transition-all hover:scale-110 active:scale-95 ${isShuffle ? 'text-[#1DB954]' : 'text-gray-400 hover:text-white'}`}
                >
                  <Shuffle size={18} />
                </button>
                <button onClick={prevTrack} className="text-gray-400 hover:text-white transition transform active:scale-90"><SkipBack size={24} fill="currentColor" /></button>
                <button 
                  onClick={togglePlay}
                  className="w-10 h-10 md:w-12 md:h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-xl"
                >
                  {isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" className="ml-1" />}
                </button>
                <button onClick={nextTrack} className="text-gray-400 hover:text-white transition transform active:scale-90"><SkipForward size={24} fill="currentColor" /></button>
                <button 
                  onClick={() => setRepeatMode(repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none')}
                  className={`transition-all hover:scale-110 active:scale-95 relative ${repeatMode !== 'none' ? 'text-[#1DB954]' : 'text-gray-400 hover:text-white'}`}
                >
                  <Repeat size={18} />
                  {repeatMode === 'one' && <span className="absolute -top-1.5 -right-1.5 text-[9px] font-black bg-black rounded-full border border-current px-0.5">1</span>}
                </button>
             </div>
             
             <div className="flex items-center gap-3 w-full max-w-xl text-[10px] text-gray-500 font-bold tracking-tighter">
                <span className="w-10 text-right">{formatTime(progress)}</span>
                <div 
                  className="h-1 flex-1 bg-white/10 rounded-full relative group cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    seek(percent);
                  }}
                >
                  <div 
                    className="absolute inset-y-0 left-0 bg-white group-hover:bg-[#1DB954] rounded-full transition-colors" 
                    style={{ width: `${(progress / (duration || 1)) * 100}%` }}
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-50%]"
                    style={{ left: `${(progress / (duration || 1)) * 100}%` }}
                  />
                </div>
                <span className="w-10">{formatTime(duration)}</span>
             </div>
          </div>

          {/* Volume & Extras */}
          <div className="flex items-center justify-end gap-6 w-1/3">
             <button className="text-gray-400 hover:text-white transition" title={t.queue}><LayoutGrid size={18} /></button>
             <div className="flex items-center gap-3 group w-32">
                <Volume2 size={18} className="text-gray-400 group-hover:text-white transition" />
                <div className="h-1 flex-1 bg-white/10 rounded-full relative cursor-pointer group">
                   <div className="absolute inset-y-0 left-0 bg-white group-hover:bg-[#1DB954] transition-colors rounded-full" style={{ width: `${volume * 100}%` }} />
                   <input 
                     type="range" 
                     min="0" max="1" step="0.01" 
                     value={volume}
                     onChange={(e) => setVolume(parseFloat(e.target.value))}
                     className="absolute inset-0 opacity-0 cursor-pointer z-10"
                   />
                </div>
             </div>
          </div>
        </div>
      </footer>

      {/* Floating Mini Player - Mobile ONLY */}
      {currentTrack && (
        <div className="fixed bottom-[94px] left-3 right-3 md:hidden z-[55]">
           <motion.div 
             initial={{ y: 20, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             onClick={() => setIsMobilePlayerOpen(true)}
             className="bg-[#1c1c1c] rounded-2xl p-3 flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.7)] ring-1 ring-white/10 active:scale-[0.98] transition-all border border-white/[0.05]"
           >
              <div className="relative">
                <img src={currentTrack.thumbnail} className="w-12 h-12 rounded-xl shadow-2xl object-cover" />
                {isPlaying && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#1DB954] rounded-full flex items-center justify-center border-2 border-[#1c1c1c]">
                    <div className="flex gap-0.5 items-end h-2">
                       <motion.div className="w-0.5 bg-black" animate={{ height: [4, 8, 5] }} transition={{ repeat: Infinity, duration: 0.6 }} />
                       <motion.div className="w-0.5 bg-black" animate={{ height: [7, 4, 8] }} transition={{ repeat: Infinity, duration: 0.8 }} />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                 <span className="text-sm font-black truncate text-white">{currentTrack.title}</span>
                 <p className="text-[11px] text-[#1DB954] font-bold truncate tracking-wide flex items-center gap-1.5 leading-none mt-1">
                    <span className="opacity-70">{currentTrack.artist}</span>
                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                    <span className="text-white/40 uppercase text-[9px] tracking-[0.1em]">Playing</span>
                 </p>
              </div>
              <div className="flex items-center gap-2">
                 <button 
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black active:scale-90 transition-transform shadow-lg"
                 >
                   {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-1" />}
                 </button>
                 <button 
                  onClick={(e) => { e.stopPropagation(); nextTrack(); }}
                  className="p-2 text-white/40 hover:text-white active:scale-90 transition-all"
                 >
                   <SkipForward size={24} />
                 </button>
              </div>
              {/* Animated Progress Line */}
              <div 
                className="absolute bottom-0 left-3 right-3 h-0.5 bg-white/5 rounded-full overflow-hidden"
              >
                <div 
                  className="h-full bg-white transition-all duration-300"
                  style={{ width: `${(progress / (duration || 1)) * 100}%` }}
                />
              </div>
           </motion.div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-[#0a0a0a]/95 backdrop-blur-3xl h-[76px] flex items-center justify-around z-[60] border-t border-white/5 px-6 pb-2 shadow-[0_-15px_40px_rgba(0,0,0,0.5)]">
         <button 
           onClick={() => setActiveTab('home')}
           className={`flex flex-col items-center gap-1.5 px-6 pt-2 transition-all active:scale-90 ${activeTab === 'home' ? 'text-white' : 'text-gray-500 opacity-50'}`}
         >
           <div className={`p-1 rounded-xl transition-all ${activeTab === 'home' ? 'bg-[#1DB954]/10' : ''}`}>
             <Home size={26} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
           </div>
           <span className="text-[10px] font-black tracking-[0.1em] uppercase">{t.home}</span>
         </button>
         <button 
           onClick={() => setActiveTab('search')}
           className={`flex flex-col items-center gap-1.5 px-6 pt-2 transition-all active:scale-90 ${activeTab === 'search' ? 'text-white' : 'text-gray-500 opacity-50'}`}
         >
           <div className={`p-1 rounded-xl transition-all ${activeTab === 'search' ? 'bg-[#1DB954]/10' : ''}`}>
             <SearchIcon size={26} strokeWidth={activeTab === 'search' ? 3 : 2} />
           </div>
           <span className="text-[10px] font-black tracking-[0.1em] uppercase">{t.search}</span>
         </button>
         <button 
           onClick={() => setActiveTab('library')}
           className={`flex flex-col items-center gap-1.5 px-6 pt-2 transition-all active:scale-90 ${activeTab === 'library' ? 'text-white' : 'text-gray-500 opacity-50'}`}
         >
           <div className={`p-1 rounded-xl transition-all ${activeTab === 'library' ? 'bg-[#1DB954]/10' : ''}`}>
             <Library size={26} strokeWidth={activeTab === 'library' ? 2.5 : 2} />
           </div>
           <span className="text-[10px] font-black tracking-[0.1em] uppercase">{t.library.split(' ')[0]}</span>
         </button>
      </nav>

      {/* Mobile Player Detail Popover */}
      <AnimatePresence>
        {isMobilePlayerOpen && currentTrack && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-[#121212] z-[100] md:hidden flex flex-col pt-12 pb-8 px-8"
          >
            <button 
              onClick={() => setIsMobilePlayerOpen(false)}
              className="absolute top-6 left-6 p-2 text-gray-400"
            >
              <ChevronDown size={32} />
            </button>

            <div className="my-auto flex flex-col gap-12">
               <motion.img 
                  layoutId={`thumb-${currentTrack.id}`}
                  src={currentTrack.thumbnail} 
                  className="w-full aspect-square object-cover rounded-xl shadow-2xl shadow-black/50" 
               />
               
               <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <h2 className="text-3xl font-bold truncate">{currentTrack.title}</h2>
                    <p className="text-lg text-[#1DB954] font-medium">{currentTrack.artist}</p>
                  </div>
                  <button 
                    onClick={() => toggleLike(currentTrack)}
                    className={`${isLiked(currentTrack.id) ? 'text-[#1DB954]' : 'text-white'} hover:scale-110 transition`}
                  >
                    <Heart size={32} fill={isLiked(currentTrack.id) ? 'currentColor' : 'none'} />
                  </button>
               </div>

               <div className="space-y-4">
                 <div className="h-1.5 w-full bg-white/10 rounded-full relative overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-white" 
                      style={{ width: `${(progress / duration) * 100}%` }}
                    />
                 </div>
                 <div className="flex justify-between text-xs font-mono text-gray-400">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                 </div>
               </div>

               <div className="flex items-center justify-between px-4">
                  <button onClick={toggleShuffle} className={`${isShuffle ? 'text-[#1DB954]' : 'text-white'}`}><Shuffle size={24} /></button>
                  <button onClick={prevTrack} className="text-white"><SkipBack size={36} fill="currentColor" /></button>
                  <button 
                    onClick={togglePlay}
                    className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center"
                  >
                    {isPlaying ? <Pause size={36} fill="black" /> : <Play size={36} fill="black" className="ml-1" />}
                  </button>
                  <button onClick={nextTrack} className="text-white"><SkipForward size={36} fill="currentColor" /></button>
                  <button 
                     onClick={() => setRepeatMode(repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none')}
                     className={`relative ${repeatMode !== 'none' ? 'text-[#1DB954]' : 'text-white'}`}
                  >
                    <Repeat size={24} />
                    {repeatMode === 'one' && <span className="absolute -top-1 -right-1 text-[10px] font-bold">1</span>}
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TrackCard({ track, onPlay, onLike, liked, active }: { track: Track; onPlay: (t: Track) => void; onLike: () => void; liked: boolean; active?: boolean }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      className="bg-[#181818]/60 hover:bg-[#282828] p-4 rounded-xl group transition-all duration-500 relative cursor-pointer shadow-2xl backdrop-blur-sm border border-white/[0.02]"
      onClick={() => onPlay(track)}
    >
      <div className="relative mb-4 aspect-square overflow-hidden rounded-lg shadow-black/40 shadow-xl">
        <motion.img 
          layoutId={`img-${track.id}`}
          src={track.thumbnail} 
          alt={track.title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute right-3 bottom-3 w-12 h-12 bg-[#1DB954] rounded-full shadow-2xl flex items-center justify-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 hover:scale-105 active:scale-95">
           <Play size={24} fill="black" className="ml-1" />
        </div>
        {active && (
           <div className="absolute top-2 left-2 bg-[#1DB954] px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-lg">
              Playing
           </div>
        )}
      </div>
      <div className="flex flex-col gap-1 overflow-hidden">
        <h3 className={`font-bold text-sm truncate group-hover:text-[#1DB954] transition-colors ${active ? 'text-[#1DB954]' : 'text-white'}`}>{track.title}</h3>
        <p className="text-xs text-gray-400 font-medium truncate opacity-60 group-hover:opacity-100 transition-opacity tracking-wide">{track.artist}</p>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); onLike(); }}
        className={`absolute top-2 right-2 p-2 rounded-full bg-black/60 backdrop-blur-md transition-all hover:scale-110 active:scale-75 shadow-lg ${liked ? 'text-[#1DB954] scale-110 opacity-100' : 'text-white opacity-0 group-hover:opacity-100'}`}
      >
        <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
      </button>
    </motion.div>
  );
}

function Sidebar({ activeTab, setActiveTab, t, likedCount, isOpen, onClose, lang, setLang }: { activeTab: string, setActiveTab: (t: any) => void, t: any, likedCount: number, isOpen?: boolean, onClose?: () => void, lang: string, setLang: (l: any) => void }) {
  return (
    <>
      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] md:hidden"
          />
        )}
      </AnimatePresence>

      <div className={`fixed md:sticky top-0 left-0 z-[80] md:z-auto h-screen w-[280px] bg-black border-r border-white/5 flex flex-col shrink-0 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-10 md:mb-10">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveTab('home')}>
              <div className="w-10 h-10 bg-[#1DB954] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(29,185,84,0.3)] group-hover:rotate-12 transition-transform">
                 <Music size={24} color="black" />
              </div>
              <span className="text-2xl font-black tracking-tighter">MusiFlow</span>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white md:hidden">
              <X size={24} />
            </button>
          </div>

        <nav className="space-y-2">
          {[
            { id: 'home', icon: Home, label: t.home },
            { id: 'search', icon: SearchIcon, label: t.search },
            { id: 'library', icon: Library, label: t.library },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold transition-all ${
                activeTab === item.id 
                  ? 'bg-white/10 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-12">
            <p className="px-4 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 mb-6">Playlists</p>
            <button 
              onClick={() => setActiveTab('library')}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-gray-400 hover:text-white transition-all group"
            >
               <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Heart size={16} fill="white" />
               </div>
               <span className="font-bold flex-1 text-left">{t.liked}</span>
               {likedCount > 0 && <span className="text-xs bg-[#1DB954] text-black px-2 py-0.5 rounded-full font-black">{likedCount}</span>}
            </button>
        </div>

        <div className="mt-auto px-4 mb-8">
            <div className="bg-white/5 rounded-2xl p-4 space-y-4">
                <div className="flex flex-col gap-2">
                   <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                     <Globe size={14} /> {t.language}
                   </div>
                   <div className="relative">
                      <select 
                        value={lang} 
                        onChange={(e) => setLang(e.target.value as any)}
                        className="w-full bg-white/5 border border-white/5 text-xs font-bold text-white rounded-lg py-2 px-3 appearance-none cursor-pointer hover:bg-white/10 transition-all"
                      >
                        {languages.map(l => <option key={l.code} value={l.code} className="bg-[#121212]">{l.name}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                   </div>
                </div>
            </div>
        </div>
      </div>

      <div className="mt-auto p-6">
         <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-5 border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#1DB954]/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
            <p className="text-sm font-black mb-1 relative z-10">MusiFlow Premium</p>
            <p className="text-[11px] text-gray-400 mb-4 relative z-10">Enjoy ad-free music & better quality.</p>
            <button className="w-full py-2 bg-white text-black text-xs font-black rounded-full hover:scale-105 active:scale-95 transition-all relative z-10 shadow-lg">Upgrade</button>
         </div>
      </div>
    </div>
    </>
  );
}

export default function App() {
  return (
    <MusicProvider>
      <AppContent />
    </MusicProvider>
  );
}
