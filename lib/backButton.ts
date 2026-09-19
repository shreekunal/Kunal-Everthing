"use client";

import { App as CapacitorApp } from "@capacitor/app";
import { haptics } from "./haptics";

export type BackHandler = () => boolean | void;

class BackButtonManager {
  private handlers: BackHandler[] = [];
  private lastBackPress = 0;
  private isInitialized = false;

  /**
   * Register a custom back-action (e.g. closing a modal, drawer, or sheet).
   * Handlers are executed in LIFO order (last registered runs first).
   * Return `true` from your handler to consume the back event.
   */
  public register(handler: BackHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  /**
   * Central processor for the back event across Capacitor & Web popstate.
   */
  public async handleBack(
    router: { push: (url: string) => void },
    pathname: string,
    showToast: (msg: string) => void
  ): Promise<void> {
    // 1. Check if any active modal/drawer/menu registered a back handler
    for (let i = this.handlers.length - 1; i >= 0; i--) {
      try {
        const consumed = this.handlers[i]();
        if (consumed) {
          haptics.impactLight();
          return;
        }
      } catch (err) {
        console.error("Back handler error:", err);
      }
    }

    // 2. If on a sub-page (e.g. /tasks, /money, /routines, /settings), return to Home (/)
    if (pathname !== "/" && pathname !== "/login") {
      haptics.selection();
      router.push("/");
      return;
    }

    // 3. On Home (/), require double-tap within 2000ms to exit
    const now = Date.now();
    if (now - this.lastBackPress < 2000) {
      try {
        await CapacitorApp.exitApp();
      } catch {
        // In mobile browser, no native exit
      }
    } else {
      this.lastBackPress = now;
      haptics.impactMedium();
      showToast("Press back again to exit");
    }
  }

  /**
   * Initialize native Capacitor back button listener and browser popstate.
   */
  public init(
    router: { push: (url: string) => void },
    getPathname: () => string,
    showToast: (msg: string) => void
  ): () => void {
    if (this.isInitialized) return () => {};
    this.isInitialized = true;

    let nativeListener: any = null;

    // 1. Native Capacitor Hardware Back Button Listener (Android)
    try {
      CapacitorApp.addListener("backButton", () => {
        this.handleBack(router, getPathname(), showToast);
      }).then((handle) => {
        nativeListener = handle;
      }).catch(() => {});
    } catch {
      // Not running in Capacitor
    }

    // 2. Mobile Browser Popstate fallback
    const handlePopstate = () => {
      // If handlers exist (e.g. modal open), consume back and restore history state
      if (this.handlers.length > 0) {
        window.history.pushState(null, "", window.location.href);
        this.handleBack(router, getPathname(), showToast);
      }
    };
    window.addEventListener("popstate", handlePopstate);

    return () => {
      this.isInitialized = false;
      if (nativeListener && typeof nativeListener.remove === "function") {
        nativeListener.remove();
      }
      window.removeEventListener("popstate", handlePopstate);
    };
  }
}

export const backButton = new BackButtonManager();
