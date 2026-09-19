"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Wallet,
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
import { backButton } from "@/lib/backButton";
import { ProfileAvatar } from "../ui/ProfileAvatar";
import { ProfileSwitcherModal } from "../profile/ProfileSwitcherModal";

interface BottomNavProps {
  onOpenQuickAdd: () => void;
}

export function BottomNav({ onOpenQuickAdd }: BottomNavProps) {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("Kunal");
  const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);

  React.useEffect(() => {
    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.userId) setCurrentUserId(data.userId);
        if (data.userName) setCurrentUserName(data.userName);
      })
      .catch(() => {});
  }, []);

  // Back Button integration: close extended drawer if open
  React.useEffect(() => {
    if (!isDrawerOpen) return;
    return backButton.register(() => {
      setIsDrawerOpen(false);
      return true;
    });
  }, [isDrawerOpen]);

  // Back Button integration: close profile switcher modal if open
  React.useEffect(() => {
    if (!isProfileSwitcherOpen) return;
    return backButton.register(() => {
      setIsProfileSwitcherOpen(false);
      return true;
    });
  }, [isProfileSwitcherOpen]);

  const handleLockPortal = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const extendedNav = [
    { name: "Money", href: "/money", icon: Wallet },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
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
          "fixed bottom-0 left-0 right-0 z-50 md:hidden bg-black/95 backdrop-blur-3xl border-t border-white/10 transition-all duration-300 ease-in-out shadow-2xl flex flex-col select-none",
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

          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 px-1">
            <button
              type="button"
              onClick={() => {
                haptics.impactMedium();
                setIsDrawerOpen(false);
                setIsProfileSwitcherOpen(true);
              }}
              className="text-xs font-bold text-white uppercase tracking-wider font-mono hover:text-brand-red transition-colors flex items-center gap-2"
              title="Switch Profile"
            >
              <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
              <span>{currentUserName || "Kunal"}</span>
            </button>
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

          {/* 4x2 App Launcher Buttons Grid - Sleek Single-Tile Design */}
          <div className="grid grid-cols-4 gap-2.5 py-2">
            {extendedNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  title={item.name}
                  aria-label={item.name}
                  onClick={() => {
                    haptics.selection();
                    setIsDrawerOpen(false);
                  }}
                  className={clsx(
                    "h-12 sm:h-13 rounded-2xl border flex items-center justify-center transition-all active:scale-90",
                    isActive
                      ? "bg-brand-red border-brand-red text-white shadow-glow-red"
                      : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-zinc-300 hover:text-white"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </Link>
              );
            })}

            {/* 8th Button: Lock OS - Single Sleek Tile */}
            <button
              type="button"
              title="Lock Everything"
              aria-label="Lock Everything"
              onClick={() => {
                haptics.warning();
                handleLockPortal();
              }}
              className="h-12 sm:h-13 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-all active:scale-90"
            >
              <Lock className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lower Primary 5-Tab Bar (Icon-Only Minimalist Mobile Dock with Eager Prefetching) */}
        <div className="h-16 px-3 flex items-center justify-around pb-safe border-t border-white/5">
          {/* 1. Home */}
          <Link
            href="/"
            prefetch={true}
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
            prefetch={true}
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
            prefetch={true}
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

      {/* Profile Switcher Modal */}
      <ProfileSwitcherModal
        isOpen={isProfileSwitcherOpen}
        onClose={() => setIsProfileSwitcherOpen(false)}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
      />
    </>
  );
}
