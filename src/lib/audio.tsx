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





function canUseLocalApi() {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

async function fallbackCobalt(trackUrl: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ url: trackUrl, downloadMode: 'audio', audioFormat: 'mp3' })
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.url) return data.url;
    return null;
  } catch {
    return null;
  }
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
          if (canUseLocalApi()) {
            const res = await fetch(`/api/play?url=${encodeURIComponent(track.url)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.status && data.result?.audio) {
                finalUrl = data.result.audio;
              }
            }
            if (!finalUrl) {
              const byQuery = await fetch(`/api/ytplay?q=${encodeURIComponent(`${track.title} ${track.artist}`)}`);
              if (byQuery.ok) {
                const qData = await byQuery.json();
                finalUrl = qData?.result?.download?.audio || null;
              }
            }
          }
          if (!finalUrl) {
            finalUrl = await fallbackCobalt(track.url);
          }
          if (!finalUrl) {
            throw new Error('Server extraction failed');
          }
        } catch (fetchErr: any) {
          console.error("Audio fetch error:", fetchErr);
          setIsPlaying(false);
          window.open(track.url, '_blank', 'noopener,noreferrer');
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
