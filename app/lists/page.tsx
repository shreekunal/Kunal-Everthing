"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ListTodo,
  Plus,
  ShoppingCart,
  Compass,
  Heart,
  FolderPlus,
  CheckCircle2,
  Circle,
  Trash2,
  X,
  Sparkles,
  WifiOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { clsx } from "clsx";
import { haptics } from "@/lib/haptics";
import { offlineQueue } from "@/lib/offlineQueue";
import { UndoToast } from "@/components/ui/UndoToast";

type ListKind = "GROCERY" | "BUCKET" | "DATE_IDEAS" | "CUSTOM";

interface SharedListItemData {
  id: string;
  listId: string;
  text: string;
  done: boolean;
  addedBy: string;
  doneBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SharedListData {
  id: string;
  title: string;
  kind: ListKind;
  createdAt: string;
  updatedAt: string;
  items: SharedListItemData[];
}

const KIND_METADATA: Record<
  ListKind,
  { label: string; icon: React.ElementType; color: string; bg: string; border: string }
> = {
  GROCERY: {
    label: "Grocery",
    icon: ShoppingCart,
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
  },
  BUCKET: {
    label: "Bucket List",
    icon: Compass,
    color: "text-amber-400",
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
  },
  DATE_IDEAS: {
    label: "Date Ideas",
    icon: Heart,
    color: "text-rose-400",
    bg: "bg-rose-500/15",
    border: "border-rose-500/30",
  },
  CUSTOM: {
    label: "Custom",
    icon: ListTodo,
    color: "text-cyan-400",
    bg: "bg-cyan-500/15",
    border: "border-cyan-500/30",
  },
};

export default function SharedListsPage() {
  const [lists, setLists] = useState<SharedListData[]>([]);
  const [currentUserName, setCurrentUserName] = useState<string>("Kunal");
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"ALL" | ListKind>("ALL");
  const [isOnline, setIsOnline] = useState(true);

  // New List State
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [newListKind, setNewListKind] = useState<ListKind>("GROCERY");
  const [submittingList, setSubmittingList] = useState(false);

  // New Item Inputs per list (keyed by listId)
  const [itemInputs, setItemInputs] = useState<Record<string, string>>({});
  const [collapsedLists, setCollapsedLists] = useState<Record<string, boolean>>({});

  // Undo Toast state for deleted items
  const [undoToast, setUndoToast] = useState<{
    isOpen: boolean;
    deletedItem: SharedListItemData | null;
    originalIndex: number;
    pendingDeleteTimeout: NodeJS.Timeout | null;
  }>({
    isOpen: false,
    deletedItem: null,
    originalIndex: -1,
    pendingDeleteTimeout: null,
  });

  const fetchLists = useCallback(async () => {
    try {
      const res = await fetch("/api/lists", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setLists(data.lists || []);
        if (data.currentUser) setCurrentUserName(data.currentUser);
      }
    } catch (err) {
      console.error("Failed to load lists:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Track online/offline status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      offlineQueue.replay().then(() => fetchLists());
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [fetchLists]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  // Create List
  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newListTitle.trim();
    if (!title || submittingList) return;

    setSubmittingList(true);
    haptics.selection();

    const tempId = `temp_${Date.now()}`;
    const optimisticList: SharedListData = {
      id: tempId,
      title,
      kind: newListKind,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [],
    };

    setLists((prev) => [optimisticList, ...prev]);
    setNewListTitle("");
    setIsCreatingList(false);

    try {
      if (!navigator.onLine) {
        offlineQueue.enqueue({
          url: "/api/lists",
          method: "POST",
          body: JSON.stringify({ title, kind: newListKind }),
          description: `Create list: ${title}`,
        });
      } else {
        const res = await fetch("/api/lists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, kind: newListKind }),
        });
        if (res.ok) {
          const data = await res.json();
          setLists((prev) =>
            prev.map((l) => (l.id === tempId ? { ...data.list, items: [] } : l))
          );
        }
      }
    } catch (err) {
      console.error("Failed to create list:", err);
    } finally {
      setSubmittingList(false);
    }
  };

  // Add Item to List
  const handleAddItem = async (listId: string) => {
    const text = (itemInputs[listId] || "").trim();
    if (!text) return;

    haptics.selection();
    const tempItemId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const optimisticItem: SharedListItemData = {
      id: tempItemId,
      listId,
      text,
      done: false,
      addedBy: currentUserName,
      doneBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistic insert
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId ? { ...l, items: [optimisticItem, ...l.items] } : l
      )
    );
    setItemInputs((prev) => ({ ...prev, [listId]: "" }));

    try {
      if (!navigator.onLine) {
        offlineQueue.enqueue({
          url: "/api/lists/items",
          method: "POST",
          body: JSON.stringify({ listId, text, id: tempItemId }),
          description: `Add item "${text}" to list`,
        });
      } else {
        const res = await fetch("/api/lists/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listId, text }),
        });
        if (res.ok) {
          const data = await res.json();
          setLists((prev) =>
            prev.map((l) =>
              l.id === listId
                ? {
                    ...l,
                    items: l.items.map((it) => (it.id === tempItemId ? data.item : it)),
                  }
                : l
            )
          );
        }
      }
    } catch (err) {
      console.error("Failed to add item:", err);
    }
  };

  // Toggle Item Done (Optimistic)
  const handleToggleItem = async (listId: string, itemId: string) => {
    haptics.selection();

    let targetItem: SharedListItemData | undefined;
    setLists((prev) =>
      prev.map((list) => {
        if (list.id !== listId) return list;
        return {
          ...list,
          items: list.items.map((it) => {
            if (it.id !== itemId) return it;
            const newDone = !it.done;
            targetItem = {
              ...it,
              done: newDone,
              doneBy: newDone ? currentUserName : null,
            };
            return targetItem;
          }),
        };
      })
    );

    if (!targetItem) return;

    try {
      if (!navigator.onLine) {
        offlineQueue.enqueue({
          url: "/api/lists/items",
          method: "PATCH",
          body: JSON.stringify({ id: itemId, done: targetItem.done }),
          description: `Mark "${targetItem.text}" as ${targetItem.done ? "done" : "undone"}`,
        });
      } else {
        await fetch("/api/lists/items", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: itemId, done: targetItem.done }),
        });
      }
    } catch (err) {
      console.error("Failed to toggle item:", err);
    }
  };

  // Delete Item with Undo Toast
  const handleDeleteItem = (listId: string, itemId: string) => {
    haptics.impactLight();

    const currentList = lists.find((l) => l.id === listId);
    if (!currentList) return;

    const itemIndex = currentList.items.findIndex((it) => it.id === itemId);
    const itemToDelete = currentList.items[itemIndex];
    if (!itemToDelete) return;

    // Optimistically remove
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId ? { ...l, items: l.items.filter((it) => it.id !== itemId) } : l
      )
    );

    // Commit delete after 10 seconds unless undone
    const timeout = setTimeout(async () => {
      try {
        if (!navigator.onLine) {
          offlineQueue.enqueue({
            url: `/api/lists/items?id=${itemId}`,
            method: "DELETE",
            description: `Delete item: ${itemToDelete.text}`,
          });
        } else {
          await fetch(`/api/lists/items?id=${itemId}`, { method: "DELETE" });
        }
      } catch (err) {
        console.error("Failed to delete item:", err);
      }
    }, 10000);

    setUndoToast({
      isOpen: true,
      deletedItem: itemToDelete,
      originalIndex: itemIndex,
      pendingDeleteTimeout: timeout,
    });
  };

  // Undo delete
  const handleUndoDelete = () => {
    if (!undoToast.deletedItem) return;
    const item = undoToast.deletedItem;
    if (undoToast.pendingDeleteTimeout) {
      clearTimeout(undoToast.pendingDeleteTimeout);
    }

    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== item.listId) return l;
        const newItems = [...l.items];
        const insertIdx = Math.min(undoToast.originalIndex, newItems.length);
        newItems.splice(insertIdx, 0, item);
        return { ...l, items: newItems };
      })
    );

    setUndoToast({
      isOpen: false,
      deletedItem: null,
      originalIndex: -1,
      pendingDeleteTimeout: null,
    });
  };

  // Delete an entire List
  const handleDeleteList = async (listId: string, title: string) => {
    const ok = window.confirm(`Delete list "${title}" and all its items?`);
    if (!ok) return;

    haptics.impactMedium();
    setLists((prev) => prev.filter((l) => l.id !== listId));

    try {
      if (!navigator.onLine) {
        offlineQueue.enqueue({
          url: `/api/lists?id=${listId}`,
          method: "DELETE",
          description: `Delete list: ${title}`,
        });
      } else {
        await fetch(`/api/lists?id=${listId}`, { method: "DELETE" });
      }
    } catch (err) {
      console.error("Failed to delete list:", err);
    }
  };

  const toggleCollapse = (listId: string) => {
    haptics.selection();
    setCollapsedLists((prev) => ({ ...prev, [listId]: !prev[listId] }));
  };

  const filteredLists = useMemo(() => {
    if (activeFilter === "ALL") return lists;
    return lists.filter((l) => l.kind === activeFilter);
  }, [lists, activeFilter]);

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-28 px-2 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-rose-400" />
              Shared Lists
            </h1>
            {!isOnline && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <WifiOff className="w-3 h-3" /> Offline (Queued)
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Groceries, bucket items &amp; date ideas for you &amp; partner
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setIsCreatingList((prev) => !prev);
          }}
          className="py-2 px-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:opacity-95 active:scale-95 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New List</span>
        </button>
      </div>

      {/* Inline Create List Drawer / Card */}
      {isCreatingList && (
        <form
          onSubmit={handleCreateList}
          className="p-4 rounded-3xl bg-zinc-950/90 border border-rose-500/30 shadow-glass-panel space-y-3 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4 text-rose-400" /> Create Shared List
            </span>
            <button
              type="button"
              onClick={() => setIsCreatingList(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            type="text"
            required
            placeholder="e.g., Weekly Groceries, Weekend Date Ideas..."
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500/50"
            autoFocus
          />

          {/* Kind Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["GROCERY", "BUCKET", "DATE_IDEAS", "CUSTOM"] as ListKind[]).map((kind) => {
              const meta = KIND_METADATA[kind];
              const Icon = meta.icon;
              const isSelected = newListKind === kind;
              return (
                <button
                  type="button"
                  key={kind}
                  onClick={() => {
                    haptics.selection();
                    setNewListKind(kind);
                  }}
                  className={clsx(
                    "py-2 px-2.5 rounded-xl text-xs font-mono flex items-center justify-center gap-1.5 transition-all border",
                    isSelected
                      ? `${meta.bg} ${meta.color} ${meta.border} font-bold shadow-sm`
                      : "bg-white/[0.02] text-zinc-400 border-white/5 hover:text-white"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={submittingList || !newListTitle.trim()}
            className="w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create List</span>
          </button>
        </form>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setActiveFilter("ALL");
          }}
          className={clsx(
            "py-1.5 px-3 rounded-xl text-xs font-mono font-semibold transition-all whitespace-nowrap border",
            activeFilter === "ALL"
              ? "bg-white/15 text-white border-white/20 font-bold"
              : "bg-white/[0.02] text-zinc-400 border-white/5 hover:text-white"
          )}
        >
          All Lists ({lists.length})
        </button>

        {(["GROCERY", "BUCKET", "DATE_IDEAS", "CUSTOM"] as ListKind[]).map((kind) => {
          const meta = KIND_METADATA[kind];
          const count = lists.filter((l) => l.kind === kind).length;
          const isSelected = activeFilter === kind;
          return (
            <button
              type="button"
              key={kind}
              onClick={() => {
                haptics.selection();
                setActiveFilter(kind);
              }}
              className={clsx(
                "py-1.5 px-3 rounded-xl text-xs font-mono font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border",
                isSelected
                  ? `${meta.bg} ${meta.color} ${meta.border} font-bold`
                  : "bg-white/[0.02] text-zinc-400 border-white/5 hover:text-white"
              )}
            >
              <span>{meta.label}</span>
              <span className="text-[10px] opacity-70 font-sans">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Lists Feed */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-6 h-6 border-2 border-rose-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-mono text-zinc-500">Syncing shared lists...</p>
        </div>
      ) : filteredLists.length === 0 ? (
        <div className="py-16 px-4 text-center rounded-3xl bg-zinc-950/60 border border-white/[0.06] space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white/5 text-zinc-400 flex items-center justify-center mx-auto mb-2">
            <ListTodo className="w-6 h-6 stroke-[1.5]" />
          </div>
          <p className="text-xs font-mono font-bold text-zinc-300">
            {activeFilter === "ALL" ? "No shared lists yet" : `No ${KIND_METADATA[activeFilter].label} lists`}
          </p>
          <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
            Create your first grocery or bucket list to plan and check off items together.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLists.map((list) => {
            const meta = KIND_METADATA[list.kind] || KIND_METADATA.CUSTOM;
            const Icon = meta.icon;
            const isCollapsed = collapsedLists[list.id];
            const completedCount = list.items.filter((it) => it.done).length;
            const totalCount = list.items.length;

            return (
              <div
                key={list.id}
                className="rounded-3xl bg-zinc-950/80 border border-white/[0.08] backdrop-blur-xl overflow-hidden shadow-sm"
              >
                {/* List Header */}
                <div className="p-3.5 sm:p-4 flex items-center justify-between border-b border-white/[0.04]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={clsx(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border",
                        meta.bg,
                        meta.border,
                        meta.color
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold font-mono text-white truncate">
                          {list.title}
                        </h3>
                        <span
                          className={clsx(
                            "px-1.5 py-0.5 rounded text-[9px] font-mono font-medium border uppercase",
                            meta.bg,
                            meta.color,
                            meta.border
                          )}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {completedCount} of {totalCount} completed
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleCollapse(list.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
                    >
                      {isCollapsed ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteList(list.id, list.title)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete list"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Collapsible Content */}
                {!isCollapsed && (
                  <div className="p-3.5 sm:p-4 space-y-3">
                    {/* Add Item Input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add item..."
                        value={itemInputs[list.id] || ""}
                        onChange={(e) =>
                          setItemInputs((prev) => ({ ...prev, [list.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddItem(list.id);
                          }
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddItem(list.id)}
                        disabled={!(itemInputs[list.id] || "").trim()}
                        className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white text-xs font-mono font-semibold flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>

                    {/* Items List */}
                    <div className="divide-y divide-white/[0.04]">
                      {list.items.length === 0 ? (
                        <div className="py-4 text-center">
                          <p className="text-[11px] text-zinc-600 font-mono">
                            No items yet. Type above to add something!
                          </p>
                        </div>
                      ) : (
                        list.items.map((item) => (
                          <div
                            key={item.id}
                            className="py-2 px-1 flex items-center justify-between gap-2.5 group hover:bg-white/[0.01] rounded-lg transition-colors"
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleItem(list.id, item.id)}
                              className="flex items-center gap-2.5 text-left min-w-0 flex-1 active:opacity-75"
                            >
                              {item.done ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-zinc-500 shrink-0" />
                              )}
                              <span
                                className={clsx(
                                  "text-xs leading-relaxed break-words font-sans",
                                  item.done
                                    ? "line-through text-zinc-500"
                                    : "text-zinc-200"
                                )}
                              >
                                {item.text}
                              </span>
                            </button>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[9px] font-mono text-zinc-600">
                                {item.done && item.doneBy
                                  ? `done by ${item.doneBy}`
                                  : item.addedBy
                                  ? `by ${item.addedBy}`
                                  : ""}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(list.id, item.id)}
                                className="p-1 rounded text-zinc-600 hover:text-rose-400 transition-colors"
                                title="Delete item"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Undo Toast */}
      <UndoToast
        isOpen={undoToast.isOpen}
        message="Item removed"
        subMessage={undoToast.deletedItem ? `"${undoToast.deletedItem.text}"` : undefined}
        durationSeconds={10}
        onUndo={handleUndoDelete}
        onClose={() =>
          setUndoToast((prev) => ({ ...prev, isOpen: false, deletedItem: null }))
        }
      />
    </div>
  );
}
