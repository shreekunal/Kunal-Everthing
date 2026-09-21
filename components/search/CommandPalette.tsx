"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  CheckSquare,
  Flame,
  Wallet,
  CreditCard,
  Calendar,
  Lock,
  Plus,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  X,
  Trophy,
} from "lucide-react";
import { backButton } from "@/lib/backButton";
import { haptics } from "@/lib/haptics";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickAdd: (tab?: string) => void;
  onOpenProfileSwitcher?: () => void;
}

interface SearchResults {
  tasks: Array<{
    id: string;
    title: string;
    priority: string;
    status: string;
    category: string;
    dueDate?: string | null;
  }>;
  routines: Array<{
    id: string;
    name: string;
    category: string;
    currentStreak: number;
    targetDays: string;
  }>;
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    category: string;
    balance: number;
  }>;
  creditCards: Array<{
    id: string;
    name: string;
    bank?: string | null;
    last4: string;
    currentOutstanding: number;
    creditLimit: number;
    dueDate: number;
  }>;
  debitCards: Array<{
    id: string;
    name: string;
    last4?: string | null;
    network: string;
  }>;
  dates: Array<{
    id: string;
    name: string;
    date: string;
    category: string;
  }>;
  vaultItems: Array<{
    id: string;
    title: string;
    type: string;
    category: string;
  }>;
}

export function CommandPalette({
  isOpen,
  onClose,
  onOpenQuickAdd,
  onOpenProfileSwitcher,
}: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<SearchResults>({
    tasks: [],
    routines: [],
    accounts: [],
    creditCards: [],
    debitCards: [],
    dates: [],
    vaultItems: [],
  });

  // Register Android Hardware Back Button
  useEffect(() => {
    if (!isOpen) return;
    return backButton.register(() => {
      onClose();
      return true;
    });
  }, [isOpen, onClose]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Search debounce
  useEffect(() => {
    if (!isOpen) return;
    if (!query.trim()) {
      setResults({
        tasks: [],
        routines: [],
        accounts: [],
        creditCards: [],
        debitCards: [],
        dates: [],
        vaultItems: [],
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(timeout);
  }, [query, isOpen]);

  // Quick Action List when search query is empty
  const defaultActions = [
    {
      id: "quick-task",
      title: "Add New Task",
      category: "Quick Action",
      icon: Plus,
      badge: "Action",
      action: () => {
        onClose();
        onOpenQuickAdd("task");
      },
    },
    {
      id: "quick-expense",
      title: "Log Expense / Spend",
      category: "Quick Action",
      icon: Wallet,
      badge: "Action",
      action: () => {
        onClose();
        onOpenQuickAdd("expense");
      },
    },
    {
      id: "quick-routine",
      title: "Add Daily Routine",
      category: "Quick Action",
      icon: Flame,
      badge: "Action",
      action: () => {
        onClose();
        onOpenQuickAdd("routine");
      },
    },
    {
      id: "nav-money",
      title: "Finances & Net Worth",
      category: "Navigation",
      icon: Wallet,
      badge: "/money",
      action: () => {
        onClose();
        router.push("/money");
      },
    },
    {
      id: "nav-tasks",
      title: "Tasks & Deliverables",
      category: "Navigation",
      icon: CheckSquare,
      badge: "/tasks",
      action: () => {
        onClose();
        router.push("/tasks");
      },
    },
    {
      id: "nav-vault",
      title: "Encrypted Secure Vault",
      category: "Security",
      icon: Shield,
      badge: "/vault",
      action: () => {
        onClose();
        router.push("/vault");
      },
    },
    {
      id: "nav-karma",
      title: "Karma & Discipline Streaks",
      category: "Habits",
      icon: Trophy,
      badge: "/rewards",
      action: () => {
        onClose();
        router.push("/rewards");
      },
    },
    {
      id: "nav-switch",
      title: "Switch Workspace Profile",
      category: "Account",
      icon: Sparkles,
      badge: "Profile",
      action: () => {
        onClose();
        if (onOpenProfileSwitcher) onOpenProfileSwitcher();
      },
    },
    {
      id: "action-lock",
      title: "Lock Everything Portal",
      category: "Security",
      icon: Lock,
      badge: "Lock",
      action: async () => {
        onClose();
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login?switch=true";
      },
    },
  ];

  // Flattened results for keyboard navigation
  const flatItems: Array<{
    id: string;
    title: string;
    subtitle?: string;
    category: string;
    icon: any;
    badge?: string;
    action: () => void;
  }> = [];

  if (!query.trim()) {
    defaultActions.forEach((a) =>
      flatItems.push({
        id: a.id,
        title: a.title,
        category: a.category,
        icon: a.icon,
        badge: a.badge,
        action: a.action,
      })
    );
  } else {
    // Tasks
    results.tasks.forEach((t) =>
      flatItems.push({
        id: `task-${t.id}`,
        title: t.title,
        subtitle: `${t.category} • Due: ${t.dueDate || "No date"}`,
        category: "Tasks",
        icon: CheckSquare,
        badge: t.priority,
        action: () => {
          onClose();
          router.push("/tasks");
        },
      })
    );

    // Accounts
    results.accounts.forEach((a) =>
      flatItems.push({
        id: `account-${a.id}`,
        title: a.name,
        subtitle: `${a.type} • ₹${a.balance.toLocaleString("en-IN")}`,
        category: "Bank Accounts",
        icon: Wallet,
        badge: `₹${a.balance.toLocaleString("en-IN")}`,
        action: () => {
          onClose();
          router.push("/money");
        },
      })
    );

    // Credit Cards
    results.creditCards.forEach((c) =>
      flatItems.push({
        id: `card-${c.id}`,
        title: `${c.name} •• ${c.last4}`,
        subtitle: `Due Day ${c.dueDate} • Outstanding: ₹${c.currentOutstanding.toLocaleString("en-IN")}`,
        category: "Credit Cards",
        icon: CreditCard,
        badge: `₹${c.currentOutstanding.toLocaleString("en-IN")}`,
        action: () => {
          onClose();
          router.push("/money");
        },
      })
    );

    // Routines
    results.routines.forEach((r) =>
      flatItems.push({
        id: `routine-${r.id}`,
        title: r.name,
        subtitle: `${r.category} • ${r.targetDays}`,
        category: "Routines",
        icon: Flame,
        badge: `${r.currentStreak} 🔥`,
        action: () => {
          onClose();
          router.push("/routines");
        },
      })
    );

    // Dates
    results.dates.forEach((d) =>
      flatItems.push({
        id: `date-${d.id}`,
        title: d.name,
        subtitle: `${d.category} • ${d.date}`,
        category: "Important Dates",
        icon: Calendar,
        badge: d.date,
        action: () => {
          onClose();
          router.push("/dates");
        },
      })
    );

    // Vault
    results.vaultItems.forEach((v) =>
      flatItems.push({
        id: `vault-${v.id}`,
        title: v.title,
        subtitle: `Encrypted ${v.type} • ${v.category}`,
        category: "Vault Items",
        icon: Shield,
        badge: "Encrypted",
        action: () => {
          onClose();
          router.push("/vault");
        },
      })
    );
  }

  // Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (flatItems.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % (flatItems.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        haptics.selection();
        flatItems[selectedIndex].action();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-3 bg-black/80 backdrop-blur-xl animate-in fade-in duration-150">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Palette Container */}
      <div
        className="relative w-full max-w-2xl bg-zinc-950/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-3xl flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-white/[0.02]">
          <Search className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, finances, habits, vault, or type a command..."
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none font-mono"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg text-zinc-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-zinc-400 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
            <span>ESC</span>
          </div>
        </div>

        {/* Scrollable Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-white/[0.04]">
          {loading && (
            <div className="p-6 text-center text-xs font-mono text-zinc-500 flex items-center justify-center gap-2">
              <span className="w-3 h-3 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
              <span>Scanning Everything OS...</span>
            </div>
          )}

          {!loading && flatItems.length === 0 && (
            <div className="p-10 text-center text-xs font-mono text-zinc-500">
              No matching tasks, cards, or accounts found for &ldquo;{query}&rdquo;.
            </div>
          )}

          {!loading &&
            flatItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    haptics.selection();
                    item.action();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-left transition-all ${
                    isSelected
                      ? "bg-brand-red/20 border border-brand-red/40 text-white shadow-glow-red-subtle"
                      : "text-zinc-300 hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl ${
                        isSelected
                          ? "bg-brand-red text-white"
                          : "bg-white/[0.05] text-zinc-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono truncate text-white">
                          {item.title}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500 px-1.5 py-0.5 rounded bg-white/5 uppercase">
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-zinc-400 font-mono truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          isSelected
                            ? "bg-brand-red/30 text-white border-brand-red/50"
                            : "bg-white/5 text-zinc-400 border-white/10"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ArrowRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isSelected ? "translate-x-0.5 text-white" : "text-zinc-600"
                      }`}
                    />
                  </div>
                </button>
              );
            })}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>ESC to close</span>
          </div>
          <span className="text-brand-red">Everything OS Spotlight</span>
        </div>
      </div>
    </div>
  );
}
