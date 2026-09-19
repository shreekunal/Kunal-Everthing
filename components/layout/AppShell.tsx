"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Navbar } from "./Navbar";
import { BottomNav } from "./BottomNav";
import { QuickAddModal } from "../quick-add/QuickAddModal";
import { backButton } from "@/lib/backButton";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddInitialTab, setQuickAddInitialTab] = useState<any>("task");
  const [exitToast, setExitToast] = useState<string | null>(null);

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

  // Global Ctrl+N / Cmd+N listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
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
      {/* Floating Glass Island Navbar */}
      <Navbar onOpenQuickAdd={() => setIsQuickAddOpen(true)} />

      {/* Full-Width Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto mt-5">
        {children}
      </main>

      {/* Mobile Floating Bottom Dock */}
      <BottomNav onOpenQuickAdd={() => setIsQuickAddOpen(true)} />

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
