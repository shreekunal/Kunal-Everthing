"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Flame,
  BarChart3,
  Wallet,
  ShieldCheck,
  Heart,
  Calendar,
  Settings,
  Plus,
  Bell,
  X,
  CheckCheck,
  Lock,
  Trophy,
} from "lucide-react";
import { clsx } from "clsx";
import { Button } from "../ui/Button";

interface NavbarProps {
  onOpenQuickAdd: () => void;
}

export function Navbar({ onOpenQuickAdd }: NavbarProps) {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
    { name: "Progress", href: "/progress", icon: BarChart3 },
    { name: "Money", href: "/money", icon: Wallet },
    { name: "Vault", href: "/vault", icon: ShieldCheck },
    { name: "Love", href: "/relationship", icon: Heart },
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
          <img src="/BrandLogo.png" alt="Everything" className="w-5 h-5 object-contain rounded" />
          <span className="font-bold text-xs tracking-[0.25em] text-white font-mono uppercase group-hover:text-brand-red transition-colors">
            EVERYTHING
          </span>
        </Link>

        {/* Center: Segmented Navigation Pills (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 overflow-x-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

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
          {/* Quick Add CTA */}
          <Button
            variant="red"
            size="sm"
            onClick={onOpenQuickAdd}
            className="text-xs h-8 px-3 gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Add</span>
          </Button>

          {/* Notification Center */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
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

            {/* Glass Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-black/95 backdrop-blur-3xl border border-white/15 rounded-2xl shadow-glass-panel z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider font-mono">
                    Notifications & Alerts
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
              </div>
            )}
          </div>

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
