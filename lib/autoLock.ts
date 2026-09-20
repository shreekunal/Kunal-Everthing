"use client";

import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

const STORAGE_KEY_MINUTES = "kunal_os_autolock_minutes";
const STORAGE_KEY_BG_TS = "kunal_os_background_timestamp";
const STORAGE_KEY_PENDING_LOCK = "kunal_os_pending_lock";

class AutoLockManager {
  private inactivityTimer: NodeJS.Timeout | null = null;
  private autoLockMinutes = 1; // Default 1 min
  private isInitialized = false;
  private isLocking = false;

  public getMinutes(): number {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY_MINUTES);
      if (stored !== null) {
        const val = parseInt(stored, 10);
        if (!isNaN(val)) return val;
      }
    }
    return this.autoLockMinutes;
  }

  public setMinutes(minutes: number): void {
    this.autoLockMinutes = minutes;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_MINUTES, minutes.toString());
    }
    this.resetInactivityTimer();
  }

  public async lockPortal(): Promise<void> {
    if (typeof window === "undefined") return;
    if (window.location.pathname === "/login") return;
    if (this.isLocking) return;

    this.isLocking = true;
    localStorage.removeItem(STORAGE_KEY_PENDING_LOCK);
    localStorage.removeItem(STORAGE_KEY_BG_TS);

    // Capture currently active user ID to present their lock screen directly
    const currentUserId = localStorage.getItem("kunal_os_current_user_id") || "";

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Auto-lock logout error:", err);
    } finally {
      if (currentUserId) {
        localStorage.setItem("kunal_os_locked_user_id", currentUserId);
        window.location.replace(`/login?locked=true&userId=${encodeURIComponent(currentUserId)}`);
      } else {
        window.location.replace("/login");
      }
      this.isLocking = false;
    }
  }

  public resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    const minutes = this.getMinutes();
    // If -1 (Never), inactivity timer is disabled
    if (minutes === -1) return;

    // If 0 (Immediate on background), provide 2-min in-app idle lock safeguard
    const effectiveMinutes = minutes === 0 ? 2 : minutes;
    const timeoutMs = effectiveMinutes * 60 * 1000;

    this.inactivityTimer = setTimeout(() => {
      this.lockPortal();
    }, timeoutMs);
  }

  public init(): () => void {
    if (typeof window === "undefined" || this.isInitialized) return () => {};
    this.isInitialized = true;

    // 1. Initial sync with server settings once
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings?.vaultAutoLockMinutes !== undefined) {
          const serverMins = data.settings.vaultAutoLockMinutes;
          // Prefer stored value if user adjusted on device, otherwise sync
          const stored = localStorage.getItem(STORAGE_KEY_MINUTES);
          if (stored === null) {
            this.setMinutes(serverMins);
          }
        }
      })
      .catch(() => {});

    // 2. Setup user activity listeners (Foreground Inactivity)
    const activityEvents = ["pointerdown", "keydown", "touchstart", "scroll"];
    const handleActivity = () => {
      this.resetInactivityTimer();
    };

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });
    this.resetInactivityTimer();

    let nativeListener: any = null;
    let webVisibilityHandler: any = null;

    // 3. Platform Branching: Native Capacitor vs Web Browser
    if (Capacitor.isNativePlatform()) {
      // NATIVE ANDROID: Use CapacitorApp appStateChange exclusively
      try {
        CapacitorApp.addListener("appStateChange", (state) => {
          const minutes = this.getMinutes();

          if (!state.isActive) {
            // App backgrounded: Record timestamp only, DO NOT trigger heavy network/redirect while paused
            const now = Date.now();
            localStorage.setItem(STORAGE_KEY_BG_TS, now.toString());

            if (minutes === 0) {
              localStorage.setItem(STORAGE_KEY_PENDING_LOCK, "true");
            }
          } else {
            // App foregrounded: Execute lock cleanly while WebView is active
            const isPending = localStorage.getItem(STORAGE_KEY_PENDING_LOCK) === "true";
            const bgTsStr = localStorage.getItem(STORAGE_KEY_BG_TS);
            localStorage.removeItem(STORAGE_KEY_BG_TS);
            localStorage.removeItem(STORAGE_KEY_PENDING_LOCK);

            if (isPending) {
              this.lockPortal();
              return;
            }

            if (bgTsStr && minutes > 0) {
              const bgTs = parseInt(bgTsStr, 10);
              const elapsedMs = Date.now() - bgTs;
              const thresholdMs = minutes * 60 * 1000;

              if (elapsedMs >= thresholdMs) {
                this.lockPortal();
                return;
              }
            }

            this.resetInactivityTimer();
          }
        })
          .then((h) => {
            nativeListener = h;
          })
          .catch(() => {});
      } catch {
        // Capacitor unavailable
      }
    } else {
      // WEB BROWSER FALLBACK: Use document.visibilitychange
      webVisibilityHandler = () => {
        const minutes = this.getMinutes();

        if (document.hidden) {
          const now = Date.now();
          localStorage.setItem(STORAGE_KEY_BG_TS, now.toString());

          if (minutes === 0) {
            localStorage.setItem(STORAGE_KEY_PENDING_LOCK, "true");
          }
        } else {
          const isPending = localStorage.getItem(STORAGE_KEY_PENDING_LOCK) === "true";
          const bgTsStr = localStorage.getItem(STORAGE_KEY_BG_TS);
          localStorage.removeItem(STORAGE_KEY_BG_TS);
          localStorage.removeItem(STORAGE_KEY_PENDING_LOCK);

          if (isPending) {
            this.lockPortal();
            return;
          }

          if (bgTsStr && minutes > 0) {
            const bgTs = parseInt(bgTsStr, 10);
            const elapsedMs = Date.now() - bgTs;
            const thresholdMs = minutes * 60 * 1000;

            if (elapsedMs >= thresholdMs) {
              this.lockPortal();
              return;
            }
          }

          this.resetInactivityTimer();
        }
      };
      document.addEventListener("visibilitychange", webVisibilityHandler);
    }

    return () => {
      this.isInitialized = false;
      if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleActivity);
      });
      if (webVisibilityHandler) {
        document.removeEventListener("visibilitychange", webVisibilityHandler);
      }
      if (nativeListener && typeof nativeListener.remove === "function") {
        nativeListener.remove();
      }
    };
  }
}

export const autoLock = new AutoLockManager();
