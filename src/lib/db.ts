import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'name-music-db';
const TRACKS_STORE = 'tracks-v2';
const PLAYLISTS_STORE = 'playlists';

export interface SavedTrack {
  id: string;
  blob?: Blob;
  metadata: any;
  savedAt: number;
}

export interface LocalPlaylist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 2, {
      upgrade(db, oldV) {
        if (!db.objectStoreNames.contains(TRACKS_STORE)) {
          db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(PLAYLISTS_STORE)) {
          db.createObjectStore(PLAYLISTS_STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export const saveTrackOffline = async (id: string, url: string, metadata: any) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const db = await getDB();
    await db.put(TRACKS_STORE, { id, blob, metadata, savedAt: Date.now() });
    return true;
  } catch (error) {
    console.error('Error saving track offline:', error);
    return false;
  }
};

export const getTrackOffline = async (id: string) => {
  const db = await getDB();
  return db.get(TRACKS_STORE, id);
};

export const getAllOfflineTracks = async () => {
  const db = await getDB();
  return db.getAll(TRACKS_STORE);
};

export const deleteTrackOffline = async (id: string) => {
  const db = await getDB();
  return db.delete(TRACKS_STORE, id);
};

// Playlist helpers
export const savePlaylist = async (playlist: LocalPlaylist) => {
  const db = await getDB();
  await db.put(PLAYLISTS_STORE, playlist);
};

export const getAllPlaylists = async () => {
  const db = await getDB();
  return db.getAll(PLAYLISTS_STORE);
};

export const deletePlaylist = async (id: string) => {
  const db = await getDB();
  return db.delete(PLAYLISTS_STORE, id);
};
