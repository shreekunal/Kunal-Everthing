"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Target,
  Heart,
  Activity,
  Flame,
  Wallet,
  BookOpen,
  Calendar,
  Settings,
  Lock,
  X,
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

  // Swipe gesture handling refs
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const isSwipingRef = useRef(false);
  const wasSwipingRef = useRef(false);
  const gestureHandledRef = useRef(false);
  const touchStartedInScrollableContentRef = useRef(false);
  const swipeResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const drawerContentRef = useRef<HTMLDivElement | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (swipeResetTimerRef.current) clearTimeout(swipeResetTimerRef.current);
    };
  }, []);

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
      isLongPressRef.current = false;
      return;
    }

    // If user was swiping / dragging, suppress tap navigation
    if (wasSwipingRef.current || isSwipingRef.current || gestureHandledRef.current) {
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
    isLongPressRef.current = false;
  };

  const handleLoveContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const origin = {
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2),
    };
    if (onOpenPartnerRadial) {
      onOpenPartnerRadial(origin);
    } else {
      window.dispatchEvent(
        new CustomEvent("open-partner-radial", { detail: { origin } })
      );
    }
  };

  // Touch gesture listeners for dock swipe-up / drawer swipe-down
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 1) return;

    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    isSwipingRef.current = false;
    gestureHandledRef.current = false;
    wasSwipingRef.current = false;

    // Check if touch started inside the scrollable drawer content vs non-scrollable shell
    const target = e.target as HTMLElement | null;
    const isInsideContent = drawerContentRef.current && drawerContentRef.current.contains(target);
    const isDragHandle = Boolean(target?.closest('[data-drag-handle="true"]'));
    touchStartedInScrollableContentRef.current = Boolean(isInsideContent && !isDragHandle);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (gestureHandledRef.current) return;
    // When partner radial wheel is active, let radial wheel track touch movements
    if (isLongPressRef.current) return;
    if (touchStartY.current === null || touchStartX.current === null) return;

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = currentY - touchStartY.current;
    const deltaX = Math.abs(currentX - touchStartX.current);

    // Cancel partner radial hold timer if finger moves beyond slop (20px)
    if (holdTimerRef.current && Math.hypot(deltaX, deltaY) > 20) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    // Mark as swiping if moved beyond 10px
    if (Math.hypot(deltaX, deltaY) > 10) {
      isSwipingRef.current = true;
    }

    // Swipe UP to open drawer (when collapsed)
    if (!isDrawerOpen && deltaY < -30 && Math.abs(deltaY) > deltaX * 1.1) {
      gestureHandledRef.current = true;
      wasSwipingRef.current = true;
      haptics.impactLight();
      setIsDrawerOpen(true);
      return;
    }

    // Swipe DOWN to close drawer (when open)
    if (isDrawerOpen && deltaY > 30 && deltaY > deltaX * 1.1) {
      // If touch started inside scrollable drawer content, only close if user is at the top
      if (touchStartedInScrollableContentRef.current) {
        if (drawerContentRef.current && drawerContentRef.current.scrollTop > 5) {
          return; // Let native scrolling take over
        }
      }
      gestureHandledRef.current = true;
      wasSwipingRef.current = true;
      haptics.impactLight();
      setIsDrawerOpen(false);
      return;
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
    touchStartX.current = null;
    touchStartedInScrollableContentRef.current = false;

    if (isSwipingRef.current || gestureHandledRef.current) {
      wasSwipingRef.current = true;
      if (swipeResetTimerRef.current) {
        clearTimeout(swipeResetTimerRef.current);
      }
      swipeResetTimerRef.current = setTimeout(() => {
        wasSwipingRef.current = false;
      }, 200);
    }
    isSwipingRef.current = false;
    gestureHandledRef.current = false;
  };

  // Intercept synthetic click events resulting from touch swipes
  const handleClickCapture = (e: React.MouseEvent) => {
    if (wasSwipingRef.current || isSwipingRef.current || gestureHandledRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  useEffect(() => {
    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.userId) setCurrentUserId(data.userId);
        if (data.userName) setCurrentUserName(data.userName);
      })
      .catch(() => {});
  }, []);

  // Back Button integration: close extended drawer if open
  useEffect(() => {
    if (!isDrawerOpen) return;
    return backButton.register(() => {
      setIsDrawerOpen(false);
      return true;
    });
  }, [isDrawerOpen]);

  // Keyboard Escape listener
  useEffect(() => {
    if (!isDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen]);

  const handleLockPortal = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const handleOpenProfile = () => {
    haptics.impactMedium();
    setIsDrawerOpen(false);
    if (onOpenProfileSwitcher) {
      onOpenProfileSwitcher();
    } else {
      window.dispatchEvent(new CustomEvent("open-profile-switcher"));
    }
  };

  // Other Apps for the Drawer with clear readable titles and icons
  const drawerApps = [
    {
      name: "Health",
      desc: "Vitals & habits",
      href: "/health",
      icon: Activity,
    },
    {
      name: "Discipline",
      desc: "Karma & rewards",
      href: "/rewards",
      icon: Flame,
    },
    {
      name: "Money",
      desc: "Finances & budget",
      href: "/money",
      icon: Wallet,
    },
    {
      name: "Diary",
      desc: "Journal & memory",
      href: "/diary",
      icon: BookOpen,
    },
    {
      name: "Dates",
      desc: "Events & calendar",
      href: "/dates",
      icon: Calendar,
    },
    {
      name: "Settings",
      desc: "Config & profile",
      href: "/settings",
      icon: Settings,
    },
  ];

  // Active checks for 4 primary pillars
  const isHomeActive = pathname === "/";
  const isTasksActive = pathname === "/tasks" || pathname.startsWith("/tasks/");
  const isFocusActive = pathname === "/progress" || pathname.startsWith("/progress/");
  const isPartnerActive =
    pathname === "/partner" ||
    pathname.startsWith("/partner/") ||
    pathname.startsWith("/partner-") ||
    pathname === "/relationship" ||
    pathname.startsWith("/relationship/");

  // Check if any drawer app is currently active
  const isDrawerAppActive = drawerApps.some(
    (app) => pathname === app.href || pathname.startsWith(app.href + "/")
  );

  return (
    <>
      {/* Mobile Backdrop when drawer is open */}
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

      {/* Concept 2: Detached Floating Glass Pill Dock */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClickCapture={handleClickCapture}
        style={{ touchAction: isDrawerOpen ? "auto" : "none" }}
        className={clsx(
          "fixed bottom-3 left-0 right-0 mx-4 sm:mx-auto max-w-lg z-50 md:hidden bg-zinc-950/90 backdrop-blur-2xl border shadow-2xl pb-safe transition-[border-color,box-shadow] duration-300 flex flex-col rounded-3xl overflow-hidden select-none",
          isDrawerOpen
            ? "border-brand-red/30 shadow-glow-red-subtle"
            : "border-white/10"
        )}
      >
        {/* Upper Extended Drawer Section: Smooth CSS Grid Row Animation */}
        <div
          className={clsx(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
            isDrawerOpen
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0 pointer-events-none"
          )}
        >
          <div className="overflow-hidden min-h-0 flex flex-col">
            <div
              ref={drawerContentRef}
              className="px-4 pt-2 pb-3 max-h-[65vh] overflow-y-auto flex flex-col no-scrollbar touch-pan-y"
            >
              {/* Drag handle to dismiss */}
              <div
                data-drag-handle="true"
                role="button"
                tabIndex={0}
                aria-label="Close drawer"
                onClick={() => {
                  haptics.impactLight();
                  setIsDrawerOpen(false);
                }}
                className="w-full flex items-center justify-center pt-1 pb-2 cursor-pointer group touch-none select-none focus:outline-none focus-visible:outline-none outline-none"
              >
                <div className="w-10 h-1 bg-white/20 group-hover:bg-white/40 rounded-full transition-colors" />
              </div>

              {/* Header row: Profile Switcher & Actions */}
              <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/10 px-1 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenProfile}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 hover:bg-white/10 transition-colors text-xs font-mono text-zinc-200 hover:text-white focus:outline-none focus-visible:outline-none outline-none select-none"
                  title="Switch Profile"
                >
                  <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
                  <span className="font-bold uppercase tracking-wider">{currentUserName || "Kunal"}</span>
                  <span className="text-[10px] text-zinc-400 font-sans ml-0.5">Switch</span>
                </button>

                <div className="flex items-center gap-2">
                  {/* Lock OS Button */}
                  <button
                    type="button"
                    title="Lock OS"
                    aria-label="Lock OS"
                    onClick={() => {
                      haptics.warning();
                      handleLockPortal();
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-950/30 border border-red-500/20 hover:bg-red-950/60 text-red-400 hover:text-red-300 transition-colors text-xs font-medium focus:outline-none focus-visible:outline-none outline-none select-none"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Lock</span>
                  </button>

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => {
                      haptics.impactLight();
                      setIsDrawerOpen(false);
                    }}
                    className="text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors focus:outline-none focus-visible:outline-none outline-none select-none"
                    aria-label="Close menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Clear Labeled App Tiles (2 columns for generous touch targets) */}
              <div className="grid grid-cols-2 gap-2.5 py-1">
                {drawerApps.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      prefetch={true}
                      title={item.name}
                      aria-label={`${item.name} - ${item.desc}`}
                      onClick={(e) => {
                        if (wasSwipingRef.current) {
                          e.preventDefault();
                          return;
                        }
                        haptics.selection();
                        setIsDrawerOpen(false);
                      }}
                      className={clsx(
                        "flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-95 group focus:outline-none focus-visible:outline-none outline-none select-none",
                        isActive
                          ? "bg-brand-red/15 border-brand-red/40 text-white shadow-glow-red-subtle"
                          : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-zinc-300 hover:text-white"
                      )}
                    >
                      <div
                        className={clsx(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          isActive
                            ? "bg-brand-red text-white shadow-glow-red"
                            : "bg-white/5 border border-white/10 text-zinc-300 group-hover:text-white group-hover:bg-white/10"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={clsx("text-sm font-semibold tracking-tight truncate", isActive ? "text-white" : "text-zinc-200")}>
                          {item.name}
                        </span>
                        <span className="text-[11px] text-zinc-400 truncate">
                          {item.desc}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Elegant Pull-Up Indicator Handle when collapsed */}
        {!isDrawerOpen && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Open App Drawer"
            title="Swipe up or tap for all apps"
            onClick={() => {
              haptics.impactLight();
              setIsDrawerOpen(true);
            }}
            className="w-full pt-2 pb-0.5 flex flex-col items-center justify-center cursor-pointer group focus:outline-none focus-visible:outline-none outline-none touch-none select-none"
          >
            <div
              className={clsx(
                "h-1 rounded-full transition-all duration-300",
                isDrawerAppActive
                  ? "w-10 bg-brand-red/70 shadow-glow-red-subtle"
                  : "w-8 bg-white/25 group-hover:bg-white/50 group-hover:w-10 group-active:scale-95"
              )}
            />
          </div>
        )}

        {/* Lower Primary 4-Pillar Bar (25% wider touch targets, comfortable single-handed reach) */}
        <div
          className={clsx(
            "h-14 px-2 flex items-center justify-around shrink-0 touch-none",
            isDrawerOpen && "border-t border-white/10"
          )}
        >
          {/* 1. Home */}
          <Link
            href="/"
            prefetch={true}
            aria-label="Home"
            title="Home"
            onClick={(e) => {
              if (wasSwipingRef.current) {
                e.preventDefault();
                return;
              }
              haptics.selection();
              if (isDrawerOpen) setIsDrawerOpen(false);
            }}
            className={clsx(
              "flex flex-col items-center justify-center flex-1 h-full py-1 transition-all active:scale-95 group focus:outline-none focus-visible:outline-none outline-none select-none",
              isHomeActive ? "text-brand-red" : "text-zinc-400 hover:text-white"
            )}
          >
            <div className={clsx("p-1.5 rounded-xl transition-all", isHomeActive ? "bg-brand-red/15" : "md:group-hover:bg-white/5")}>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className={clsx("text-[10px] font-medium tracking-tight mt-0.5 transition-colors", isHomeActive ? "text-brand-red font-semibold" : "text-zinc-400 md:group-hover:text-zinc-200")}>
              Home
            </span>
            <span
              className={clsx(
                "w-1 h-1 rounded-full mt-0.5 transition-all",
                isHomeActive ? "bg-brand-red shadow-glow-red" : "bg-transparent opacity-0"
              )}
            />
          </Link>

          {/* 2. Tasks */}
          <Link
            href="/tasks"
            prefetch={true}
            aria-label="Tasks"
            title="Tasks"
            onClick={(e) => {
              if (wasSwipingRef.current) {
                e.preventDefault();
                return;
              }
              haptics.selection();
              if (isDrawerOpen) setIsDrawerOpen(false);
            }}
            className={clsx(
              "flex flex-col items-center justify-center flex-1 h-full py-1 transition-all active:scale-95 group focus:outline-none focus-visible:outline-none outline-none select-none",
              isTasksActive ? "text-brand-red" : "text-zinc-400 hover:text-white"
            )}
          >
            <div className={clsx("p-1.5 rounded-xl transition-all", isTasksActive ? "bg-brand-red/15" : "md:group-hover:bg-white/5")}>
              <CheckSquare className="w-5 h-5" />
            </div>
            <span className={clsx("text-[10px] font-medium tracking-tight mt-0.5 transition-colors", isTasksActive ? "text-brand-red font-semibold" : "text-zinc-400 md:group-hover:text-zinc-200")}>
              Tasks
            </span>
            <span
              className={clsx(
                "w-1 h-1 rounded-full mt-0.5 transition-all",
                isTasksActive ? "bg-brand-red shadow-glow-red" : "bg-transparent opacity-0"
              )}
            />
          </Link>

          {/* 3. Focus */}
          <Link
            href="/progress"
            prefetch={true}
            aria-label="Focus"
            title="Focus"
            onClick={(e) => {
              if (wasSwipingRef.current) {
                e.preventDefault();
                return;
              }
              haptics.selection();
              if (isDrawerOpen) setIsDrawerOpen(false);
            }}
            className={clsx(
              "flex flex-col items-center justify-center flex-1 h-full py-1 transition-all active:scale-95 group focus:outline-none focus-visible:outline-none outline-none select-none",
              isFocusActive ? "text-brand-red" : "text-zinc-400 hover:text-white"
            )}
          >
            <div className={clsx("p-1.5 rounded-xl transition-all", isFocusActive ? "bg-brand-red/15" : "md:group-hover:bg-white/5")}>
              <Target className="w-5 h-5" />
            </div>
            <span className={clsx("text-[10px] font-medium tracking-tight mt-0.5 transition-colors", isFocusActive ? "text-brand-red font-semibold" : "text-zinc-400 md:group-hover:text-zinc-200")}>
              Focus
            </span>
            <span
              className={clsx(
                "w-1 h-1 rounded-full mt-0.5 transition-all",
                isFocusActive ? "bg-brand-red shadow-glow-red" : "bg-transparent opacity-0"
              )}
            />
          </Link>

          {/* 4. Partner Hub (Hold for Radial Bloom, Tap for Partner Page) */}
          <button
            type="button"
            aria-label="Partner Hub (Hold for quick messages)"
            title="Partner Hub (Hold for quick messages)"
            onPointerDown={handleLovePointerDown}
            onPointerUp={handleLovePointerUp}
            onPointerCancel={handleLovePointerCancel}
            onContextMenu={handleLoveContextMenu}
            onClick={(e) => e.preventDefault()}
            className={clsx(
              "flex flex-col items-center justify-center flex-1 h-full py-1 transition-all active:scale-95 group touch-none select-none focus:outline-none focus-visible:outline-none outline-none",
              isPartnerActive ? "text-rose-400" : "text-zinc-400 hover:text-white"
            )}
          >
            <div
              className={clsx(
                "p-1.5 rounded-xl transition-all",
                isPartnerActive
                  ? "bg-rose-500/15 text-rose-400"
                  : "md:group-hover:bg-rose-500/10 md:group-hover:text-rose-400"
              )}
            >
              <Heart className={clsx("w-5 h-5 transition-transform group-active:scale-110", isPartnerActive && "fill-rose-500/20")} />
            </div>
            <span
              className={clsx(
                "text-[10px] font-medium tracking-tight mt-0.5 transition-colors",
                isPartnerActive ? "text-rose-400 font-semibold" : "text-zinc-400 md:group-hover:text-rose-300"
              )}
            >
              Partner
            </span>
            <span
              className={clsx(
                "w-1 h-1 rounded-full mt-0.5 transition-all",
                isPartnerActive
                  ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                  : "bg-transparent opacity-0"
              )}
            />
          </button>
        </div>
      </div>
    </>
  );
}
