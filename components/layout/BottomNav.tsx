"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Wallet,
  ShieldCheck,
  Plus,
  Menu,
  X,
  Flame,
  BarChart3,
  Heart,
  Calendar,
  Settings,
  Lock,
  Trophy,
} from "lucide-react";
import { clsx } from "clsx";
import { haptics } from "@/lib/haptics";

interface BottomNavProps {
  onOpenQuickAdd: () => void;
}

export function BottomNav({ onOpenQuickAdd }: BottomNavProps) {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleLockPortal = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const mainNav = [
    { name: "Home", href: "/", icon: LayoutDashboard },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Money", href: "/money", icon: Wallet },
    { name: "Vault", href: "/vault", icon: ShieldCheck },
  ];

  const drawerNav = [
    { name: "Zero-Knowledge Vault", href: "/vault", icon: ShieldCheck },
    { name: "Money & Accounts", href: "/money", icon: Wallet },
    { name: "Discipline Karma & XP", href: "/rewards", icon: Trophy },
    { name: "Routines & Habits", href: "/routines", icon: Flame },
    { name: "Work & Study Tracker", href: "/progress", icon: BarChart3 },
    { name: "Important Dates", href: "/dates", icon: Calendar },
    { name: "Settings & Backup", href: "/settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-40 md:hidden"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Mobile Drawer Menu */}
      <div
        className={clsx(
          "fixed bottom-20 left-4 right-4 bg-black/95 backdrop-blur-3xl border border-white/15 rounded-3xl p-4 z-40 md:hidden shadow-glass-panel transition-all duration-200 transform",
          isDrawerOpen
            ? "translate-y-0 opacity-100 scale-100"
            : "translate-y-8 opacity-0 pointer-events-none scale-95"
        )}
      >
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
          <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Navigation Menu
          </span>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="text-zinc-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-1">
          <div className="space-y-1">
            {drawerNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => {
                    haptics.selection();
                    setIsDrawerOpen(false);
                  }}
                  className={clsx(
                    "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-mono font-medium transition-colors",
                    isActive
                      ? "bg-brand-red text-white shadow-glow-red-subtle font-bold"
                      : "text-zinc-300 hover:text-white hover:bg-white/[0.04]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-zinc-400" />
                    <span>{item.name}</span>
                  </div>
                  {item.href === "/vault" && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                      Encrypted
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <button
            onClick={() => {
              haptics.warning();
              handleLockPortal();
            }}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono font-medium text-red-400 hover:bg-red-500/10 transition-colors w-full text-left mt-1 border-t border-white/5 pt-3"
          >
            <Lock className="w-4 h-4 text-red-400" />
            <span>Lock Everything Portal</span>
          </button>
        </div>
      </div>

      {/* Bottom Floating Glass Navigation Dock */}
      <div className="fixed bottom-3 left-4 right-4 h-16 bg-black/85 backdrop-blur-2xl border border-white/10 rounded-2xl z-30 md:hidden flex items-center justify-around px-2 shadow-glass-panel pb-safe">
        {/* 1. Home */}
        <Link
          href="/"
          onClick={() => haptics.selection()}
          className={clsx(
            "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-mono transition-colors",
            pathname === "/" ? "text-brand-red font-bold" : "text-zinc-400 hover:text-white"
          )}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </Link>

        {/* 2. Tasks */}
        <Link
          href="/tasks"
          onClick={() => haptics.selection()}
          className={clsx(
            "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-mono transition-colors",
            pathname === "/tasks" ? "text-brand-red font-bold" : "text-zinc-400 hover:text-white"
          )}
        >
          <CheckSquare className="w-5 h-5 mb-0.5" />
          <span>Tasks</span>
        </Link>

        {/* 3. Floating Quick Add Button */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            onClick={() => {
              haptics.impactMedium();
              onOpenQuickAdd();
            }}
            className="w-12 h-12 rounded-full bg-brand-red hover:bg-brand-redDark text-white flex items-center justify-center shadow-glow-red border border-red-400/40 active:scale-95 transition-transform"
            aria-label="Quick Add"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* 4. Relationship Hub */}
        <Link
          href="/relationship"
          onClick={() => haptics.selection()}
          className={clsx(
            "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-mono transition-colors",
            pathname === "/relationship" ? "text-brand-red font-bold" : "text-zinc-400 hover:text-white"
          )}
        >
          <Heart className="w-5 h-5 mb-0.5" />
          <span>Love</span>
        </Link>

        {/* 5. More Drawer */}
        <button
          onClick={() => {
            haptics.impactLight();
            setIsDrawerOpen(!isDrawerOpen);
          }}
          className={clsx(
            "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-mono transition-colors",
            isDrawerOpen ? "text-brand-red font-bold" : "text-zinc-400 hover:text-white"
          )}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>More</span>
        </button>
      </div>
    </>
  );
}
