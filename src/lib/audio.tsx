import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { getTrackOffline } from './db';
import { Track } from '../types';

interface MusicContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  queue: Track[];
  repeatMode: 'none' | 'all' | 'one';
  isShuffle: boolean;
  playTrack: (track: Track, tracks?: Track[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setVolume: (vol: number) => void;
  seek: (percent: number) => void;
  addToQueue: (track: Track) => void;
  setRepeatMode: (mode: 'none' | 'all' | 'one') => void;
  toggleShuffle: () => void;
}






const API_BASE = (import.meta as any).env?.VITE_API_BASE?.replace(/\/$/, '') || '';
const apiUrl = (path: string) => `${API_BASE}${path}`;
const hasServerApi = !!API_BASE || ['localhost','127.0.0.1'].includes(window.location.hostname);


function playBackgroundVideo(trackUrl: string) {
  const videoId = trackUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
  if (!videoId) return;

  const existing = document.getElementById('name-music-bg-video');
  if (existing) existing.remove();

  const wrapper = document.createElement('div');
  wrapper.id = 'name-music-bg-video';
  wrapper.style.position = 'fixed';
  wrapper.style.right = '12px';
  wrapper.style.bottom = '96px';
  wrapper.style.width = '220px';
  wrapper.style.height = '124px';
  wrapper.style.zIndex = '9999';
  wrapper.style.borderRadius = '12px';
  wrapper.style.overflow = 'hidden';
  wrapper.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)';
  wrapper.style.background = '#000';

  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&controls=0&loop=1&playlist=${videoId}`;
  iframe.allow = 'autoplay; encrypted-media';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = '0';

  const controls = document.createElement('div');
  controls.style.position = 'absolute';
  controls.style.top = '6px';
  controls.style.right = '6px';
  controls.style.display = 'flex';
  controls.style.gap = '6px';

  const minBtn = document.createElement('button');
  minBtn.textContent = '–';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  [minBtn, closeBtn].forEach((b) => {
    b.style.background = 'rgba(0,0,0,0.65)';
    b.style.color = '#fff';
    b.style.border = '0';
    b.style.borderRadius = '999px';
    b.style.width = '24px';
    b.style.height = '24px';
    b.style.cursor = 'pointer';
  });

  let minimized = false;
  minBtn.onclick = () => {
    minimized = !minimized;
    iframe.style.display = minimized ? 'none' : 'block';
    wrapper.style.height = minimized ? '32px' : '124px';
    wrapper.style.width = minimized ? '110px' : '220px';
  };
  closeBtn.onclick = () => wrapper.remove();

  controls.appendChild(minBtn);
  controls.appendChild(closeBtn);
  wrapper.appendChild(iframe);
  wrapper.appendChild(controls);
  document.body.appendChild(wrapper);
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
    return Number(localStorage.getItem('name-music:volume')) || 0.7;
  });
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState<Track[]>([]);
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>(() => {
    return (localStorage.getItem('name-music:repeatMode') as any) || 'none';
  });
  const [isShuffle, setIsShuffle] = useState(() => {
    return localStorage.getItem('name-music:isShuffle') === 'true';
  });
  
  const howlRef = useRef<Howl | null>(null);
  const progressInterval = useRef<number | null>(null);
  const playRequestIdRef = useRef(0);
  const [playCounts, setPlayCounts] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('name-music:playCounts') || '{}'); } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem('name-music:playCounts', JSON.stringify(playCounts));
  }, [playCounts]);

  const cleanup = () => {
    if (howlRef.current) {
      howlRef.current.unload();
      howlRef.current = null;
    }
    if (progressInterval.current) {
      window.clearInterval(progressInterval.current);
    }
  };

  const playTrack = async (track: Track, tracks?: Track[]) => {
    const requestId = ++playRequestIdRef.current;
    cleanup();
    setCurrentTrack(track);
    setPlayCounts(prev => ({ ...prev, [track.id]: (prev[track.id] || 0) + 1 }));
    setIsPlaying(true);
    setProgress(0);
    setDuration(0);

    // Set the queue. If a list is provided, use it and remove duplicates.
    let resolvedQueue = queue;
    if (tracks && tracks.length > 0) {
      resolvedQueue = Array.from(new Map(tracks.map(t => [t.id, t])).values());
      setQueue(resolvedQueue);
    } else if (queue.length === 0) {
      resolvedQueue = [track];
      setQueue(resolvedQueue);
    }

    try {
      let finalUrl = track.audioUrl;

      // Check offline first
      try {
        const offline = await getTrackOffline(track.id);
        if (offline) {
          finalUrl = URL.createObjectURL(offline.blob);
        }
      } catch (e) {
        console.warn("Offline check failed", e);
      }

      // If no audioUrl and not offline, fetch from server extractor
      if (!finalUrl && track.url) {
        try {
          if (!hasServerApi) {
            throw new Error('Server API unavailable on this host');
          }

          const query = `${track.title} ${track.artist}`.trim();
          const byQuery = await fetch(apiUrl(`/api/ytplay?q=${encodeURIComponent(query)}`));
          if (byQuery.ok) {
            const qData = await byQuery.json();
            finalUrl = qData?.result?.download?.audio || null;
          }

          if (!finalUrl) {
            const res = await fetch(apiUrl(`/api/play?url=${encodeURIComponent(track.url)}`));
            if (res.ok) {
              const data = await res.json();
              if (data.status && data.result?.audio) {
                finalUrl = data.result.audio;
              }
            }
          }

          if (!finalUrl) {
            throw new Error('Server extraction failed');
          }
        } catch (fetchErr: any) {
          console.error("Audio fetch error:", fetchErr);
          setIsPlaying(false);
          playBackgroundVideo(track.url);
          return;
        }
      }

      if (!finalUrl) {
        throw new Error("No usable audio URL found");
      }

      if (requestId !== playRequestIdRef.current) {
        return;
      }

      const sound = new Howl({
        src: [finalUrl],
        html5: true,
        volume: volume,
        onplay: () => {
          setDuration(sound.duration());
          startProgressTimer();
          setIsPlaying(true);
        },
        onpause: () => setIsPlaying(false),
        onstop: () => setIsPlaying(false),
        onend: () => {
          setIsPlaying(false);
          if (repeatMode === 'one') {
            sound.play();
          } else {
            nextTrack();
          }
        },
        onloaderror: (id, err) => {
           console.error("Howl load error:", err);
           setIsPlaying(false);
        },
        onplayerror: (id, err) => {
          console.error("Howl play error:", err);
          sound.once('unlock', () => sound.play());
        }
      });

      if (requestId !== playRequestIdRef.current) {
        sound.unload();
        return;
      }

      howlRef.current = sound;
      sound.play();
    } catch (error) {
      console.error("Critical play error:", error);
      setIsPlaying(false);
    }
  };

  const startProgressTimer = () => {
    if (progressInterval.current) window.clearInterval(progressInterval.current);
    progressInterval.current = window.setInterval(() => {
      if (howlRef.current && isPlaying) {
        const seek = howlRef.current.seek();
        const currentPos = typeof seek === 'number' ? seek : 0;
        setProgress(currentPos);
        
        // Update Media Session position
        if ('mediaSession' in navigator && duration > 0) {
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: 1,
            position: currentPos
          });
        }
      }
    }, 1000);
  };

  const togglePlay = () => {
    if (!howlRef.current) return;
    if (isPlaying) {
      howlRef.current.pause();
    } else {
      howlRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    if (queue.length === 0) return;

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      playTrack(queue[randomIndex]);
      return;
    }

    const currentIndex = currentTrack ? queue.findIndex(t => t.id === currentTrack.id) : -1;
    const nextIndex = currentIndex + 1;

    if (nextIndex < queue.length) {
      playTrack(queue[nextIndex]);
    } else if (repeatMode === 'all') {
      playTrack(queue[0]);
    } else {
      const ranked = [...queue]
        .filter(t => !currentTrack || t.id !== currentTrack.id)
        .sort((a, b) => (playCounts[b.id] || 0) - (playCounts[a.id] || 0));

      const sameArtist = ranked.find(t => currentTrack && t.artist === currentTrack.artist);
      const recommended = sameArtist || ranked[0];

      if (recommended) {
        playTrack(recommended, queue);
      } else {
        setIsPlaying(false);
        setCurrentTrack(null);
      }
    }
  };

  const prevTrack = () => {
    if (queue.length === 0) return;

    const currentIndex = currentTrack ? queue.findIndex(t => t.id === currentTrack.id) : -1;
    const prevIndex = currentIndex - 1;

    if (prevIndex >= 0) {
      playTrack(queue[prevIndex]);
    } else if (repeatMode === 'all') {
      playTrack(queue[queue.length - 1]);
    }
  };

  const seek = (percent: number) => {
    if (howlRef.current) {
      const time = duration * percent;
      howlRef.current.seek(time);
      setProgress(time);
    }
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    if (howlRef.current) {
      howlRef.current.volume(vol);
    }
  };

  const addToQueue = (track: Track) => {
    setQueue(prev => {
      if (prev.find(t => t.id === track.id)) return prev;
      return [...prev, track];
    });
  };

  const toggleShuffle = () => setIsShuffle(prev => {
    const newVal = !prev;
    localStorage.setItem('name-music:isShuffle', String(newVal));
    return newVal;
  });

  const handleSetRepeatMode = (mode: 'none' | 'all' | 'one') => {
    setRepeatMode(mode);
    localStorage.setItem('name-music:repeatMode', mode);
  };

  useEffect(() => {
    localStorage.setItem('volume', String(volume));
  }, [volume]);

  useEffect(() => {
    return cleanup;
  }, []);

  useEffect(() => {
    if (currentTrack && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: 'MusiFlow',
        artwork: [
          { src: currentTrack.thumbnail, sizes: '96x96', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '128x128', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '192x192', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '256x256', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '384x384', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' },
        ]
      });

      navigator.mediaSession.setActionHandler('play', togglePlay);
      navigator.mediaSession.setActionHandler('pause', togglePlay);
      navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
      navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seek(details.seekTime / duration);
        }
      });
    }
  }, [currentTrack, duration]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  return (
    <MusicContext.Provider value={{
      currentTrack, isPlaying, volume, progress, duration, queue, repeatMode, isShuffle,
      playTrack, togglePlay, nextTrack, prevTrack, setVolume: handleVolumeChange, seek, 
      addToQueue, setRepeatMode: handleSetRepeatMode, toggleShuffle
    }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) throw new Error("useMusic must be used within MusicProvider");
  return context;
};
