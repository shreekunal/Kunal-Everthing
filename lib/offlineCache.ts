"use client";

interface CacheEnvelope<T> {
  data: T;
  timestamp: number;
  version: string;
}

const CACHE_PREFIX = "kunal_os_swr_";
const DEFAULT_VERSION = "2.0";

export const offlineCache = {
  getScopedKey(key: string, userId?: string): string {
    const uid =
      userId ||
      (typeof window !== "undefined"
        ? localStorage.getItem("kunal_os_current_user_id") || "global"
        : "global");
    return `${CACHE_PREFIX}${uid}_${key}`;
  },

  get<T>(key: string, userId?: string): T | null {
    if (typeof window === "undefined") return null;
    try {
      const fullKey = this.getScopedKey(key, userId);
      const item = localStorage.getItem(fullKey);
      if (!item) return null;
      const envelope: CacheEnvelope<T> = JSON.parse(item);
      if (envelope.version !== DEFAULT_VERSION) {
        localStorage.removeItem(fullKey);
        return null;
      }
      return envelope.data;
    } catch {
      return null;
    }
  },

  set<T>(key: string, data: T, version: string = DEFAULT_VERSION, userId?: string): void {
    if (typeof window === "undefined") return;
    try {
      const envelope: CacheEnvelope<T> = {
        data,
        timestamp: Date.now(),
        version,
      };
      const fullKey = this.getScopedKey(key, userId);
      localStorage.setItem(fullKey, JSON.stringify(envelope));
    } catch (err) {
      console.warn("Offline cache storage quota exceeded or failed:", err);
    }
  },

  remove(key: string, userId?: string): void {
    if (typeof window === "undefined") return;
    try {
      const fullKey = this.getScopedKey(key, userId);
      localStorage.removeItem(fullKey);
    } catch {}
  },

  clearUser(userId?: string): void {
    if (typeof window === "undefined") return;
    try {
      const uid =
        userId || localStorage.getItem("kunal_os_current_user_id") || "global";
      const targetPrefix = `${CACHE_PREFIX}${uid}_`;
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith(targetPrefix)) {
          localStorage.removeItem(k);
        }
      }
    } catch {}
  },

  clearAll(): void {
    if (typeof window === "undefined") return;
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith(CACHE_PREFIX) || k.startsWith("everything_dashboard_cache")) {
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
    onCachedData?: (data: T) => void,
    userId?: string
  ): Promise<T> {
    const cached = this.get<T>(key, userId);
    if (cached !== null && onCachedData) {
      onCachedData(cached);
    }

    try {
      const fresh = await fetcher();
      this.set<T>(key, fresh, DEFAULT_VERSION, userId);
      return fresh;
    } catch (networkError) {
      if (cached !== null) {
        return cached;
      }
      throw networkError;
    }
  },
};
