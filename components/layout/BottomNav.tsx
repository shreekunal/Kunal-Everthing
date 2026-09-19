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
  ChevronDown,
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

  const extendedNav = [
    { name: "Vault", href: "/vault", icon: ShieldCheck },
    { name: "Money", href: "/money", icon: Wallet },
    { name: "Habits", href: "/routines", icon: Flame },
    { name: "Focus", href: "/progress", icon: BarChart3 },
    { name: "Discipline", href: "/rewards", icon: Trophy },
    { name: "Dates", href: "/dates", icon: Calendar },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop when extended */}
      <div
        className={clsx(
          "fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300",
          isDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => {
          haptics.impactLight();
          setIsDrawerOpen(false);
        }}
      />

      {/* Unified Bottom Menu Container - Smoothly Extends Up */}
      <div
        className={clsx(
          "fixed bottom-0 left-0 right-0 z-50 md:hidden bg-black/95 backdrop-blur-3xl border-t border-white/10 transition-all duration-300 ease-in-out shadow-2xl flex flex-col",
          isDrawerOpen
            ? "rounded-t-3xl border-brand-red/30 shadow-glow-red-subtle max-h-[85vh]"
            : "rounded-t-none max-h-20"
        )}
      >
        {/* Upper Extended Drawer Section - Buttons Menu Grid */}
        <div
          className={clsx(
            "transition-all duration-300 ease-in-out overflow-y-auto px-4",
            isDrawerOpen
              ? "max-h-[65vh] opacity-100 pt-3 pb-3"
              : "max-h-0 opacity-0 p-0 pointer-events-none"
          )}
        >
          {/* Grab Handle */}
          <div
            onClick={() => {
              haptics.impactLight();
              setIsDrawerOpen(false);
            }}
            className="w-10 h-1 bg-white/20 hover:bg-white/40 rounded-full mx-auto mb-2.5 cursor-pointer transition-colors"
          />

          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-red" />
              Everthing
            </span>
            <button
              onClick={() => {
                haptics.impactLight();
                setIsDrawerOpen(false);
              }}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 4x2 App Launcher Buttons Grid */}
          <div className="grid grid-cols-4 gap-2 py-1">
            {extendedNav.map((item) => {
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
                    "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center group",
                    isActive
                      ? "bg-brand-red/20 border-brand-red/50 text-white shadow-glow-red-subtle font-bold"
                      : "bg-white/[0.03] hover:bg-white/[0.07] border-white/10 text-zinc-300 hover:text-white"
                  )}
                >
                  <div
                    className={clsx(
                      "w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 transition-transform group-active:scale-90",
                      isActive
                        ? "bg-brand-red text-white shadow-glow-red"
                        : "bg-white/[0.05] border border-white/10 text-zinc-200 group-hover:text-white group-hover:bg-white/10"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-medium truncate w-full text-center">
                    {item.name}
                  </span>
                </Link>
              );
            })}

            {/* 8th Button: Lock OS */}
            <button
              type="button"
              onClick={() => {
                haptics.warning();
                handleLockPortal();
              }}
              className="flex flex-col items-center justify-center p-2 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-center transition-all active:scale-95 group"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 bg-red-500/20 border border-red-500/40 text-red-400 group-hover:bg-red-500 group-hover:text-white transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-medium text-red-400 truncate w-full text-center">
                Lock Everything
              </span>
            </button>
          </div>
        </div>

        {/* Lower Primary 5-Tab Bar (Icon-Only Minimalist Mobile Dock) */}
        <div className="h-16 px-3 flex items-center justify-around pb-safe border-t border-white/5">
          {/* 1. Home */}
          <Link
            href="/"
            aria-label="Home"
            onClick={() => {
              haptics.selection();
              if (isDrawerOpen) setIsDrawerOpen(false);
            }}
            className={clsx(
              "flex flex-col items-center justify-center flex-1 h-full py-1 transition-all active:scale-95 group",
              pathname === "/" ? "text-brand-red" : "text-zinc-400 hover:text-white"
            )}
          >
            <div className={clsx("p-1.5 rounded-xl transition-all", pathname === "/" && "bg-brand-red/15")}>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className={clsx("w-1 h-1 rounded-full mt-0.5 transition-all", pathname === "/" ? "bg-brand-red shadow-glow-red" : "bg-transparent opacity-0")} />
          </Link>

          {/* 2. Tasks */}
          <Link
            href="/tasks"
            aria-label="Tasks"
            onClick={() => {
              haptics.selection();
              if (isDrawerOpen) setIsDrawerOpen(false);
            }}
            className={clsx(
              "flex flex-col items-center justify-center flex-1 h-full py-1 transition-all active:scale-95 group",
              pathname === "/tasks" ? "text-brand-red" : "text-zinc-400 hover:text-white"
            )}
          >
            <div className={clsx("p-1.5 rounded-xl transition-all", pathname === "/tasks" && "bg-brand-red/15")}>
              <CheckSquare className="w-5 h-5" />
            </div>
            <span className={clsx("w-1 h-1 rounded-full mt-0.5 transition-all", pathname === "/tasks" ? "bg-brand-red shadow-glow-red" : "bg-transparent opacity-0")} />
          </Link>

          {/* 3. Floating Quick Add Button */}
          <div className="flex-1 flex justify-center -mt-5">
            <button
              onClick={() => {
                haptics.impactMedium();
                if (isDrawerOpen) setIsDrawerOpen(false);
                onOpenQuickAdd();
              }}
              className="w-12 h-12 rounded-full bg-brand-red hover:bg-brand-redDark text-white flex items-center justify-center shadow-glow-red border border-red-400/40 active:scale-90 transition-transform"
              aria-label="Quick Add"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          {/* 4. Relationship Hub */}
          <Link
            href="/relationship"
            aria-label="Relationship"
            onClick={() => {
              haptics.selection();
              if (isDrawerOpen) setIsDrawerOpen(false);
            }}
            className={clsx(
              "flex flex-col items-center justify-center flex-1 h-full py-1 transition-all active:scale-95 group",
              pathname === "/relationship" ? "text-brand-red" : "text-zinc-400 hover:text-white"
            )}
          >
            <div className={clsx("p-1.5 rounded-xl transition-all", pathname === "/relationship" && "bg-brand-red/15")}>
              <Heart className="w-5 h-5" />
            </div>
            <span className={clsx("w-1 h-1 rounded-full mt-0.5 transition-all", pathname === "/relationship" ? "bg-brand-red shadow-glow-red" : "bg-transparent opacity-0")} />
          </Link>

          {/* 5. More Button (Toggles extending the menu up) */}
          <button
            aria-label={isDrawerOpen ? "Close Menu" : "More Applications"}
            onClick={() => {
              haptics.impactLight();
              setIsDrawerOpen(!isDrawerOpen);
            }}
            className={clsx(
              "flex flex-col items-center justify-center flex-1 h-full py-1 transition-all active:scale-95 group",
              isDrawerOpen ? "text-brand-red" : "text-zinc-400 hover:text-white"
            )}
          >
            <div className={clsx("p-1.5 rounded-xl transition-all", isDrawerOpen && "bg-brand-red/15")}>
              {isDrawerOpen ? (
                <X className="w-5 h-5 text-brand-red" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </div>
            <span className={clsx("w-1 h-1 rounded-full mt-0.5 transition-all", isDrawerOpen ? "bg-brand-red shadow-glow-red" : "bg-transparent opacity-0")} />
          </button>
        </div>
      </div>
    </>
  );
}
