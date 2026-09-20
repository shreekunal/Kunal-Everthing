"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Navbar } from "./Navbar";
import { BottomNav } from "./BottomNav";
import { QuickAddModal } from "../quick-add/QuickAddModal";
import { CommandPalette } from "../search/CommandPalette";
import { ProfileSwitcherModal } from "../profile/ProfileSwitcherModal";
import { OfflineBanner } from "../ui/OfflineBanner";
import { backButton } from "@/lib/backButton";
import { autoLock } from "@/lib/autoLock";
import { offlineQueue } from "@/lib/offlineQueue";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddInitialTab, setQuickAddInitialTab] = useState<any>("task");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("Kunal");
  const [exitToast, setExitToast] = useState<string | null>(null);

  // Initialize Auto-Lock Manager (mobile backgrounding & web inactivity)
  useEffect(() => {
    if (pathname === "/login") return;
    const cleanup = autoLock.init();
    return () => {
      cleanup();
    };
  }, [pathname]);

  // Initialize Service Worker and Offline Mutation Queue
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register Service Worker for offline app shell caching and ultra-fast boot
    if ("serviceWorker" in navigator) {
      const isProduction =
        process.env.NODE_ENV === "production" ||
        window.location.hostname !== "localhost";

      if (isProduction) {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            reg.onupdatefound = () => {
              const installingWorker = reg.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (
                    installingWorker.state === "installed" &&
                    navigator.serviceWorker.controller
                  ) {
                    installingWorker.postMessage({ type: "SKIP_WAITING" });
                  }
                };
              }
            };
          })
          .catch((err) => {
            console.warn("[SW] Registration error:", err);
          });
      }
    }

    // Initialize Offline Mutation Queue listener (auto-replays on reconnect)
    const cleanupQueue = offlineQueue.init();
    return () => {
      cleanupQueue();
    };
  }, []);

  // Fetch current user status & listen for global profile switcher requests
  useEffect(() => {
    fetch("/api/auth/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.userId) {
          setCurrentUserId(data.userId);
          localStorage.setItem("kunal_os_current_user_id", data.userId);
        }
        if (data?.userName) {
          setCurrentUserName(data.userName);
          localStorage.setItem("kunal_os_current_user_name", data.userName);
        }
      })
      .catch(() => {});

    const handleOpenProfileSwitcher = () => setIsProfileSwitcherOpen(true);
    window.addEventListener("open-profile-switcher", handleOpenProfileSwitcher);
    return () => {
      window.removeEventListener("open-profile-switcher", handleOpenProfileSwitcher);
    };
  }, []);

  // Initialize Intelligent Android Back Button & Popstate Navigation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const cleanup = backButton.init(
      router,
      () => window.location.pathname,
      (msg) => {
        setExitToast(msg);
        clearTimeout(timer);
        timer = setTimeout(() => setExitToast(null), 2000);
      }
    );
    return () => {
      cleanup();
      clearTimeout(timer);
    };
  }, [router]);

  // Register Quick Add modal with back-button manager
  useEffect(() => {
    if (!isQuickAddOpen) return;
    return backButton.register(() => {
      setIsQuickAddOpen(false);
      return true; // consumed back action
    });
  }, [isQuickAddOpen]);

  // Register Command Palette modal with back-button manager
  useEffect(() => {
    if (!isSearchOpen) return;
    return backButton.register(() => {
      setIsSearchOpen(false);
      return true; // consumed back action
    });
  }, [isSearchOpen]);

  // Register Profile Switcher modal with back-button manager
  useEffect(() => {
    if (!isProfileSwitcherOpen) return;
    return backButton.register(() => {
      setIsProfileSwitcherOpen(false);
      return true; // consumed back action
    });
  }, [isProfileSwitcherOpen]);

  // Deep-link / App Shortcut listener (?action=quickadd&tab=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "quickadd") {
      const tab = params.get("tab");
      if (tab) {
        setQuickAddInitialTab(tab);
      }
      setIsQuickAddOpen(true);
      // Clean query params from URL bar cleanly
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K for search, Cmd+N / Ctrl+N for quick add)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setQuickAddInitialTab("task");
        setIsQuickAddOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // For login/lock screen, render pure fullscreen view
  if (pathname === "/login") {
    return <main className="min-h-screen bg-black text-foreground">{children}</main>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-foreground antialiased selection:bg-brand-red selection:text-white pb-28 md:pb-8 pt-2">
      {/* Offline Mode Banner */}
      <OfflineBanner />

      {/* Floating Glass Island Navbar */}
      <Navbar
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenProfileSwitcher={() => setIsProfileSwitcherOpen(true)}
      />

      {/* Full-Width Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto mt-5">
        {children}
      </main>

      {/* Mobile Floating Bottom Dock */}
      <BottomNav
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onOpenProfileSwitcher={() => setIsProfileSwitcherOpen(true)}
      />

      {/* Global Command Palette (Cmd + K / Mobile Search) */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onOpenQuickAdd={(tab) => {
          if (tab) setQuickAddInitialTab(tab);
          setIsQuickAddOpen(true);
        }}
        onOpenProfileSwitcher={() => setIsProfileSwitcherOpen(true)}
      />

      {/* Global Profile Switcher Modal (Root z-index above all navigation) */}
      <ProfileSwitcherModal
        isOpen={isProfileSwitcherOpen}
        onClose={() => setIsProfileSwitcherOpen(false)}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
      />

      {/* Global Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        initialTab={quickAddInitialTab}
        onClose={() => setIsQuickAddOpen(false)}
        onItemAdded={() => {
          window.dispatchEvent(new CustomEvent("kunal-os-refresh"));
        }}
      />

      {/* Double-tap Back Button Toast Pill */}
      {exitToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[999] px-4 py-2 rounded-full bg-zinc-900/95 border border-white/20 text-white text-xs font-mono font-medium shadow-2xl backdrop-blur-md pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
          {exitToast}
        </div>
      )}
    </div>
  );
}
