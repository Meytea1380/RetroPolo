import { GameItem } from '../types';

const DB_NAME = 'retrovibe_emulator_db';
const DB_VERSION = 1;
const STORE_ROMS = 'roms';
const STORE_SAVES = 'save_states';
const STORE_GAMES = 'games';

class RetroDB {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_ROMS)) {
          db.createObjectStore(STORE_ROMS); // key: gameId, value: ArrayBuffer or Blob
        }
        if (!db.objectStoreNames.contains(STORE_SAVES)) {
          db.createObjectStore(STORE_SAVES); // key: `${gameId}_slot_${slot}`, value: ArrayBuffer or State
        }
        if (!db.objectStoreNames.contains(STORE_GAMES)) {
          db.createObjectStore(STORE_GAMES, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  async saveRom(gameId: string, romBlob: Blob | ArrayBuffer): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ROMS, 'readwrite');
      const store = tx.objectStore(STORE_ROMS);
      const req = store.put(romBlob, gameId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getRom(gameId: string): Promise<Blob | ArrayBuffer | null> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ROMS, 'readonly');
      const store = tx.objectStore(STORE_ROMS);
      const req = store.get(gameId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveGameState(gameId: string, slot: number, stateData: ArrayBuffer | Blob): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SAVES, 'readwrite');
      const store = tx.objectStore(STORE_SAVES);
      const key = `${gameId}_slot_${slot}`;
      const req = store.put(stateData, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getGameState(gameId: string, slot: number): Promise<ArrayBuffer | Blob | null> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SAVES, 'readonly');
      const store = tx.objectStore(STORE_SAVES);
      const key = `${gameId}_slot_${slot}`;
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveGameMetadata(game: GameItem): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_GAMES, 'readwrite');
      const store = tx.objectStore(STORE_GAMES);
      const req = store.put(game);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getAllCustomGames(): Promise<GameItem[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_GAMES, 'readonly');
      const store = tx.objectStore(STORE_GAMES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteGame(gameId: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_GAMES, STORE_ROMS, STORE_SAVES], 'readwrite');
      tx.objectStore(STORE_GAMES).delete(gameId);
      tx.objectStore(STORE_ROMS).delete(gameId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearAll(): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_GAMES, STORE_ROMS, STORE_SAVES], 'readwrite');
      tx.objectStore(STORE_GAMES).clear();
      tx.objectStore(STORE_ROMS).clear();
      tx.objectStore(STORE_SAVES).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const retroDb = new RetroDB();
