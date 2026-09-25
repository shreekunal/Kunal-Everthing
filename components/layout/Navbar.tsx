"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Flame,
  GraduationCap,
  Users,
  Wallet,
  Heart,
  Calendar,
  Settings,
  Bell,
  X,
  CheckCheck,
  Lock,
  Trophy,
  BookOpen,
} from "lucide-react";
import { clsx } from "clsx";
import { BrandLogo } from "../ui/BrandLogo";
import { haptics } from "@/lib/haptics";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  onOpenQuickAdd?: () => void;
  onOpenSearch?: () => void;
  onOpenProfileSwitcher?: () => void;
  onOpenPartnerRadial?: (origin?: { x: number; y: number }) => void;
  onOpenQuickAddRadial?: (origin?: { x: number; y: number }) => void;
}

export function Navbar({
  onOpenQuickAdd,
  onOpenSearch,
  onOpenProfileSwitcher,
  onOpenPartnerRadial,
  onOpenQuickAddRadial,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const desktopHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const desktopLongPressRef = useRef(false);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  const handleLockPortal = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const navigation = [
    { name: "Home", href: "/", icon: LayoutDashboard },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Routines", href: "/routines", icon: Flame },
    { name: "Karma", href: "/rewards", icon: Trophy },
    { name: "Progress", href: "/progress", icon: GraduationCap },
    { name: "Partner", href: "/partner", icon: Heart },
    { name: "Diary", href: "/diary", icon: BookOpen },
    { name: "Money", href: "/money", icon: Wallet },
    { name: "Dates", href: "/dates", icon: Calendar },
    { name: "Settings", href: "/settings", icon: Settings },
  ];



  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Silently poll
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // Silently ignore
    }
  };

  return (
    <header className="sticky top-3 z-40 w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="bg-black/85 backdrop-blur-2xl border border-white/10 rounded-2xl px-4 py-2.5 shadow-glass-panel flex items-center justify-between gap-3">
        {/* Left: Minimalist Branding */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
          <BrandLogo className="w-5 h-5" />
          <span className="font-bold text-xs tracking-[0.25em] text-white font-mono uppercase group-hover:text-brand-red transition-colors">
            EVERYTHING
          </span>
        </Link>

        {/* Center: Segmented Navigation Pills (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 overflow-x-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            if (item.name === "Love") {
              return (
                <button
                  key={item.name}
                  type="button"
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    desktopLongPressRef.current = false;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const origin = {
                      x: Math.round(rect.left + rect.width / 2),
                      y: Math.round(rect.bottom + 10),
                    };
                    desktopHoldTimerRef.current = setTimeout(() => {
                      desktopLongPressRef.current = true;
                      haptics.impactMedium();
                      if (onOpenPartnerRadial) {
                        onOpenPartnerRadial(origin);
                      } else {
                        window.dispatchEvent(
                          new CustomEvent("open-partner-radial", { detail: { origin } })
                        );
                      }
                    }, 200);
                  }}
                  onPointerUp={() => {
                    if (desktopHoldTimerRef.current) {
                      clearTimeout(desktopHoldTimerRef.current);
                      desktopHoldTimerRef.current = null;
                    }
                    if (desktopLongPressRef.current) return;
                    haptics.selection();
                    router.push("/relationship");
                  }}
                  onPointerCancel={() => {
                    if (desktopHoldTimerRef.current) {
                      clearTimeout(desktopHoldTimerRef.current);
                      desktopHoldTimerRef.current = null;
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const origin = {
                      x: Math.round(rect.left + rect.width / 2),
                      y: Math.round(rect.bottom + 10),
                    };
                    if (onOpenPartnerRadial) {
                      onOpenPartnerRadial(origin);
                    } else {
                      window.dispatchEvent(
                        new CustomEvent("open-partner-radial", { detail: { origin } })
                      );
                    }
                  }}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap select-none touch-none",
                    isActive
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)] font-semibold"
                      : "text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10"
                  )}
                  title="Click: Partner Hub • Hold or Right-click: Radial Quick Messages"
                >
                  <Icon className={clsx("w-3.5 h-3.5", isActive ? "text-rose-400" : "text-rose-500/70")} />
                  <span>{item.name}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-brand-red text-white shadow-glow-red-subtle font-semibold"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                )}
              >
                <Icon className={clsx("w-3.5 h-3.5", isActive ? "text-white" : "text-zinc-500")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Notification Center */}
          {mounted ? (
            <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/10 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-red text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-glow-red font-mono">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-80 sm:w-96 p-0 border border-white/15 bg-black/95 backdrop-blur-3xl rounded-2xl shadow-glass-panel overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider font-mono">
                    Notifications &amp; Alerts
                  </span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 font-mono font-medium"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-zinc-400 hover:text-white p-0.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-500 font-mono">
                      No active alerts. All systems running smooth!
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3.5 hover:bg-white/[0.04] transition-colors ${
                          !notif.isRead ? "bg-red-500/[0.04]" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-white">
                            {notif.title}
                          </h4>
                          <span className="text-[9px] text-red-400 font-mono px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                            {notif.category}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              type="button"
              className="relative p-2 rounded-xl bg-white/[0.04] text-zinc-300 border border-white/10"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
          )}

          {/* Lock OS Portal CTA */}
          <button
            onClick={handleLockPortal}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-red-500/20 text-zinc-300 hover:text-red-400 border border-white/10 hover:border-red-500/30 transition-colors"
            title="Lock Everything Portal"
            aria-label="Lock Portal"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
