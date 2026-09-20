"use client";

export interface QueuedMutation {
  id: string;
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body?: string;
  headers?: Record<string, string>;
  description: string;
  createdAt: number;
  retryCount: number;
}

const QUEUE_STORAGE_KEY = "kunal_os_offline_mutations_v1";

class OfflineQueueManager {
  private isSyncing = false;
  private initialized = false;

  public getQueue(): QueuedMutation[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: QueuedMutation[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
      window.dispatchEvent(
        new CustomEvent("offline-queue-updated", {
          detail: { pendingCount: queue.length },
        })
      );
    } catch (err) {
      console.warn("Failed to persist offline mutation queue:", err);
    }
  }

  public enqueue(
    mutation: Omit<QueuedMutation, "id" | "createdAt" | "retryCount">
  ): QueuedMutation {
    const queue = this.getQueue();
    const item: QueuedMutation = {
      ...mutation,
      id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      retryCount: 0,
    };

    queue.push(item);
    this.saveQueue(queue);
    return item;
  }

  public remove(id: string): void {
    const queue = this.getQueue().filter((item) => item.id !== id);
    this.saveQueue(queue);
  }

  public clear(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(QUEUE_STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent("offline-queue-updated", { detail: { pendingCount: 0 } })
    );
  }

  public async replay(): Promise<{ syncedCount: number; failedCount: number }> {
    if (typeof window === "undefined") return { syncedCount: 0, failedCount: 0 };
    if (!navigator.onLine || this.isSyncing) {
      return { syncedCount: 0, failedCount: 0 };
    }

    const queue = this.getQueue();
    if (queue.length === 0) return { syncedCount: 0, failedCount: 0 };

    this.isSyncing = true;
    let syncedCount = 0;
    let failedCount = 0;

    try {
      for (const item of queue) {
        try {
          const res = await fetch(item.url, {
            method: item.method,
            headers: item.headers || { "Content-Type": "application/json" },
            body: item.body,
          });

          // 2xx Success or 404 (already deleted/synchronized elsewhere)
          if (res.ok || res.status === 404) {
            this.remove(item.id);
            syncedCount++;
          } else if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
            // Unrecoverable client error (e.g. 400 Bad Request, 401 Unauthenticated, 403 Forbidden)
            console.warn(`[OfflineQueue] Discarding invalid mutation ${item.id}:`, res.status);
            this.remove(item.id);
            failedCount++;
          } else {
            // Server error or throttling - keep in queue for next retry
            item.retryCount++;
            break;
          }
        } catch (networkErr) {
          // Network connection dropped or still offline
          console.warn(`[OfflineQueue] Network error during replay for ${item.id}, aborting loop:`, networkErr);
          break;
        }
      }

      if (syncedCount > 0) {
        window.dispatchEvent(
          new CustomEvent("offline-queue-synced", {
            detail: { syncedCount },
          })
        );
        // Refresh page data silently
        window.dispatchEvent(new CustomEvent("kunal-os-refresh"));
      }
    } finally {
      this.isSyncing = false;
    }

    return { syncedCount, failedCount };
  }

  /**
   * Transparent fetch wrapper: executes online or enqueues offline.
   */
  public async offlineFetch(
    url: string,
    init?: RequestInit,
    description: string = "Pending action"
  ): Promise<Response> {
    const method = (init?.method || "GET").toUpperCase() as QueuedMutation["method"];
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

    // If completely offline and it's a mutation, enqueue immediately
    if (typeof window !== "undefined" && !navigator.onLine && isMutation) {
      this.enqueue({
        url,
        method,
        body: typeof init?.body === "string" ? init.body : JSON.stringify(init?.body || {}),
        headers: (init?.headers as Record<string, string>) || {
          "Content-Type": "application/json",
        },
        description,
      });

      return new Response(
        JSON.stringify({
          success: true,
          queued: true,
          message: `${description} queued for offline sync`,
        }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    try {
      const response = await fetch(url, init);
      return response;
    } catch (networkError) {
      if (isMutation) {
        this.enqueue({
          url,
          method,
          body: typeof init?.body === "string" ? init.body : JSON.stringify(init?.body || {}),
          headers: (init?.headers as Record<string, string>) || {
            "Content-Type": "application/json",
          },
          description,
        });

        return new Response(
          JSON.stringify({
            success: true,
            queued: true,
            message: `${description} saved offline. Will sync when reconnected.`,
          }),
          {
            status: 202,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      throw networkError;
    }
  }

  public init(): () => void {
    if (typeof window === "undefined" || this.initialized) {
      return () => {};
    }

    this.initialized = true;

    const handleOnline = () => {
      // Short 1s debounce to allow network socket to stabilize
      setTimeout(() => {
        this.replay();
      }, 1000);
    };

    window.addEventListener("online", handleOnline);

    // Initial check on boot
    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      this.initialized = false;
    };
  }
}

export const offlineQueue = new OfflineQueueManager();
