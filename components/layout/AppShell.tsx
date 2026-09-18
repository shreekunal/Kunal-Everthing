"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { BottomNav } from "./BottomNav";
import { QuickAddModal } from "../quick-add/QuickAddModal";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Global Ctrl+N / Cmd+N listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
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
    <div className="flex flex-col min-h-screen bg-black text-foreground antialiased selection:bg-brand-red selection:text-white pb-20 md:pb-8 pt-2">
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
        onClose={() => setIsQuickAddOpen(false)}
        onItemAdded={() => {
          window.dispatchEvent(new CustomEvent("kunal-os-refresh"));
        }}
      />
    </div>
  );
}

