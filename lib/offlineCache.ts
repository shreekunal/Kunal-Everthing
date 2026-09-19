"use client";

interface CacheEnvelope<T> {
  data: T;
  timestamp: number;
  version: string;
}

const CACHE_PREFIX = "kunal_os_swr_";
const DEFAULT_VERSION = "1.0";

export const offlineCache = {
  get<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    try {
      const item = localStorage.getItem(CACHE_PREFIX + key);
      if (!item) return null;
      const envelope: CacheEnvelope<T> = JSON.parse(item);
      return envelope.data;
    } catch {
      return null;
    }
  },

  set<T>(key: string, data: T, version: string = DEFAULT_VERSION): void {
    if (typeof window === "undefined") return;
    try {
      const envelope: CacheEnvelope<T> = {
        data,
        timestamp: Date.now(),
        version,
      };
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(envelope));
    } catch (err) {
      console.warn("Offline cache storage quota exceeded or failed:", err);
    }
  },

  remove(key: string): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(CACHE_PREFIX + key);
    } catch {}
  },

  clearAll(): void {
    if (typeof window === "undefined") return;
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(k);
        }
      }
    } catch {}
  },

  /**
   * Stale-While-Revalidate fetcher:
   * 1. If cached data exists, invokes `onCachedData(cached)` immediately (0ms).
   * 2. Then fetches from network in the background and saves fresh data.
   * 3. If offline or fetch fails, relies safely on cached data without breaking UI.
   */
  async swr<T>(
    key: string,
    fetcher: () => Promise<T>,
    onCachedData?: (data: T) => void
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null && onCachedData) {
      onCachedData(cached);
    }

    try {
      const fresh = await fetcher();
      this.set<T>(key, fresh);
      return fresh;
    } catch (networkError) {
      if (cached !== null) {
        return cached;
      }
      throw networkError;
    }
  },
};
