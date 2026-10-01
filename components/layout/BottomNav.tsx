"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Wallet,
  Menu,
  X,
  Flame,
  Heart,
  Calendar,
  Settings,
  Lock,
  BookOpen,
  Target,
  GraduationCap,
  Activity,
} from "lucide-react";
import { clsx } from "clsx";
import { haptics } from "@/lib/haptics";
import { backButton } from "@/lib/backButton";

interface BottomNavProps {
  onOpenProfileSwitcher?: () => void;
  onOpenPartnerRadial?: (origin?: { x: number; y: number }) => void;
}

export function BottomNav({
  onOpenProfileSwitcher,
  onOpenPartnerRadial,
}: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("Kunal");

  // Love Radial Hold State
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const handleLovePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    isLongPressRef.current = false;

    const rect = e.currentTarget.getBoundingClientRect();
    const origin = {
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2),
    };

    holdTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      haptics.impactMedium();
      if (isDrawerOpen) setIsDrawerOpen(false);
      if (onOpenPartnerRadial) {
        onOpenPartnerRadial(origin);
      } else {
        window.dispatchEvent(
          new CustomEvent("open-partner-radial", { detail: { origin } })
        );
      }
    }, 200);
  };

  const handleLovePointerUp = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    // If long press triggered, radial wheel manages pointerup to release-launch
    if (isLongPressRef.current) {
      return;
    }

    // Short tap: navigate normally to /partner
    haptics.selection();
    if (isDrawerOpen) setIsDrawerOpen(false);
    router.push("/partner");
  };

  const handleLovePointerCancel = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

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

  const handleLockPortal = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const extendedNav = [
    { name: "Health", href: "/health", icon: Activity },
    { name: "Habits", href: "/routines", icon: Flame },
    { name: "Discipline", href: "/Trophy", icon: Target },
    { name: "Diary", href: "/diary", icon: BookOpen },
    { name: "Money", href: "/money", icon: Wallet },
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
                if (onOpenProfileSwitcher) {
                  onOpenProfileSwitcher();
                } else {
                  window.dispatchEvent(new CustomEvent("open-profile-switcher"));
                }
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

          {/* 4x2 App Launcher Buttons Grid - 7 App Tiles + 1 Lock Button */}
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

            {/* 8. Lock Everything Tile Button */}
            <button
              type="button"
              title="Lock Everything"
              aria-label="Lock Everything"
              onClick={() => {
                haptics.warning();
                handleLockPortal();
              }}
              className="h-12 sm:h-13 rounded-2xl border border-red-500/30 bg-red-950/25 hover:bg-red-950/50 text-red-400 hover:text-red-300 flex items-center justify-center transition-all active:scale-90 shadow-sm"
            >
              <Lock className="w-5 h-5 text-red-400" />
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

          {/* 3. Study & Focus Hero Button (Replaces '+') */}
          <div className="flex-1 flex justify-center -mt-5">
            <Link
              href="/progress"
              prefetch={true}
              onClick={() => {
                haptics.impactMedium();
                if (isDrawerOpen) setIsDrawerOpen(false);
              }}
              className={clsx(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 select-none shadow-glow-red",
                pathname === "/progress"
                  ? "bg-brand-red text-white border-2 border-white/50 scale-105"
                  : "bg-brand-red hover:bg-brand-redDark text-white border border-red-400/40"
              )}
              aria-label="Study & Focus"
              title="Study & Focus"
            >
              <GraduationCap className="w-6 h-6" />
            </Link>
          </div>

          {/* 4. Relationship Hub / Traditional Radial Bloom (Hold to bloom, slide to petals, release to dispatch) */}
          <button
            type="button"
            aria-label="Partner Hub & Quick Messages"
            onPointerDown={handleLovePointerDown}
            onPointerUp={handleLovePointerUp}
            onPointerCancel={handleLovePointerCancel}
            onContextMenu={(e) => e.preventDefault()}
            onClick={(e) => e.preventDefault()}
            className={clsx(
              "flex flex-col items-center justify-center flex-1 h-full py-1 transition-all active:scale-95 group touch-none select-none",
              pathname === "/partner" || pathname === "/relationship" ? "text-rose-400" : "text-zinc-400 hover:text-white"
            )}
          >
            <div
              className={clsx(
                "p-1.5 rounded-xl transition-all",
                pathname === "/partner" || pathname === "/relationship"
                  ? "bg-rose-500/15 text-rose-400"
                  : "group-hover:text-rose-400"
              )}
            >
              <Heart className="w-5 h-5 fill-rose-500/20" />
            </div>
            <span
              className={clsx(
                "w-1 h-1 rounded-full mt-0.5 transition-all",
                pathname === "/partner" || pathname === "/relationship"
                  ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                  : "bg-transparent opacity-0"
              )}
            />
          </button>

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
