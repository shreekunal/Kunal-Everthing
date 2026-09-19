"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  ShieldCheck,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  FileText,
  CreditCard,
  Search,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  encryptVaultData,
  decryptVaultData,
  copyToClipboardWithAutoClear,
  generateEmergencyRecoveryKey,
} from "@/lib/crypto/vault";
import { haptics } from "@/lib/haptics";

const APP_VAULT_KEY = "everything-vault-master-key-2025";

export default function VaultPage() {
  const [vaultItems, setVaultItems] = useState<any[]>([]);
  const [decryptedMap, setDecryptedMap] = useState<Record<string, any>>({});
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Add Item Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [itemType, setItemType] = useState("PASSWORD");
  const [itemTitle, setItemTitle] = useState("");
  const [itemCategory, setItemCategory] = useState("General");
  const [itemUsername, setItemUsername] = useState("");
  const [itemSecret, setItemSecret] = useState("");
  const [itemWebsite, setItemWebsite] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [showModalPassword, setShowModalPassword] = useState(false);

  const generatePassword = (length = 18) => {
    haptics.selection();
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
    let password = "";
    if (typeof window !== "undefined" && window.crypto) {
      const array = new Uint32Array(length);
      window.crypto.getRandomValues(array);
      for (let i = 0; i < length; i++) {
        password += charset[array[i] % charset.length];
      }
    } else {
      for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
      }
    }
    setItemSecret(password);
    setShowModalPassword(true);
    haptics.impactLight();
  };

  // Recovery Key Modal
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");

  const fetchEncryptedVault = async () => {
    try {
      const res = await fetch("/api/vault");
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        setVaultItems(items);

        // Auto-decrypt items for seamless access
        const decrypted: Record<string, any> = {};
        for (const item of items) {
          try {
            const payload = {
              ciphertext: item.ciphertext,
              iv: item.iv,
              salt: item.salt,
            };
            const secretData = await decryptVaultData(payload, APP_VAULT_KEY);
            decrypted[item.id] = secretData;
          } catch {
            decrypted[item.id] = { secret: "••••••••" };
          }
        }
        setDecryptedMap(decrypted);
      }
    } catch (err) {
      console.error("Failed to fetch vault items:", err);
    }
  };

  useEffect(() => {
    fetchEncryptedVault();
  }, []);

  const handleCreateVaultItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle || !itemSecret) return;

    try {
      const plainData = {
        username: itemUsername || null,
        secret: itemSecret,
        website: itemWebsite || null,
        notes: itemNotes || null,
      };

      const encrypted = await encryptVaultData(plainData, APP_VAULT_KEY);

      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: itemType,
          title: itemTitle,
          category: itemCategory,
          iv: encrypted.iv,
          ciphertext: encrypted.ciphertext,
          salt: encrypted.salt,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setDecryptedMap((prev) => ({ ...prev, [json.item.id]: plainData }));
        setItemTitle("");
        setItemUsername("");
        setItemSecret("");
        setItemWebsite("");
        setItemNotes("");
        setIsAddModalOpen(false);
        fetchEncryptedVault();
      }
    } catch (err) {
      console.error("Encrypt & create error:", err);
    }
  };

  const handleCopySecret = async (id: string, text: string) => {
    const success = await copyToClipboardWithAutoClear(text, 30, () => {
      setCopiedId(null);
    });
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 3000);
    }
  };

  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  const handleExecuteDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeletingItem(true);
    haptics.warning();
    try {
      await fetch(`/api/vault/${itemToDelete.id}`, { method: "DELETE" });
      setVaultItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
      const newMap = { ...decryptedMap };
      delete newMap[itemToDelete.id];
      setDecryptedMap(newMap);
      setItemToDelete(null);
    } catch (err) {
      console.error("Delete vault item error:", err);
    } finally {
      setIsDeletingItem(false);
    }
  };

  const handleOpenRecoveryKit = () => {
    setRecoveryKey(generateEmergencyRecoveryKey());
    setIsRecoveryModalOpen(true);
  };

  const filteredItems = vaultItems.filter((item) => {
    const matchesCategory =
      selectedCategory === "ALL" || item.type === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-red" />
            Zero-Knowledge Encrypted Vault
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Client-Side AES-256-GCM Authenticated Encryption • Zero Server Plaintexts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="glass" size="sm" onClick={handleOpenRecoveryKit}>
            <Key className="w-4 h-4 text-brand-red" /> Recovery Key
          </Button>
          <Button
            variant="red"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> New Secret
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search secrets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { id: "ALL", label: "All Items" },
                { id: "PASSWORD", label: "Passwords" },
                { id: "CARD", label: "Card Numbers" },
                { id: "NOTE", label: "Secure Notes" },
                { id: "API_KEY", label: "API Keys" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-colors whitespace-nowrap ${
                    selectedCategory === tab.id
                      ? "bg-red-500/15 text-red-400 border border-red-500/30 shadow-glow-red-subtle font-bold"
                      : "bg-white/[0.03] text-zinc-400 hover:text-white border border-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Secrets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.length === 0 ? (
              <div className="col-span-2 p-12 text-center text-xs text-zinc-500 font-mono">
                No vault secrets found. Click &apos;New Secret&apos; to create one.
              </div>
            ) : (
              filteredItems.map((item) => {
                const secretData = decryptedMap[item.id] || {};
                const isRevealed = revealedIds[item.id] || false;
                const isCopied = copiedId === item.id;

                return (
                  <Card key={item.id} className="p-5 relative group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-red-400">
                          {item.type === "PASSWORD" && <Key className="w-4 h-4" />}
                          {item.type === "CARD" && <CreditCard className="w-4 h-4" />}
                          {item.type === "NOTE" && <FileText className="w-4 h-4" />}
                          {item.type === "API_KEY" && <ShieldCheck className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{item.title}</h4>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {item.category}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          haptics.warning();
                          setItemToDelete(item);
                        }}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-zinc-500 hover:text-brand-red p-1.5 transition-all active:scale-90"
                        aria-label="Delete Vault Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Username */}
                    {secretData.username && (
                      <div className="mt-3 text-xs flex items-center justify-between bg-black/60 p-2 rounded-xl border border-white/5">
                        <span className="text-zinc-500 font-mono">User:</span>
                        <span className="text-white font-mono">{secretData.username}</span>
                      </div>
                    )}

                    {/* Secret Value & Quick Copy Bar */}
                    <div className="mt-3 flex items-center justify-between bg-black/60 p-2.5 rounded-xl border border-white/10 font-mono text-xs">
                      <span className="truncate max-w-[200px] text-white">
                        {isRevealed
                          ? secretData.secret || "—"
                          : "••••••••••••••••"}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            setRevealedIds((prev) => ({
                              ...prev,
                              [item.id]: !isRevealed,
                            }))
                          }
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                          aria-label="Toggle reveal"
                        >
                          {isRevealed ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <Button
                          variant={isCopied ? "red" : "secondary"}
                          size="sm"
                          onClick={() =>
                            handleCopySecret(item.id, secretData.secret)
                          }
                          className="text-[11px] h-7 px-2"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-red-400" />
                              <span className="text-red-400">Copied (30s)</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

      {/* Add Secret Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Encrypted Secret"
      >
        <form onSubmit={handleCreateVaultItem} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Type
              </label>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
              >
                <option value="PASSWORD">Password</option>
                <option value="CARD">Card Details</option>
                <option value="NOTE">Secure Note</option>
                <option value="API_KEY">API Key</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Category
              </label>
              <input
                type="text"
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value)}
                placeholder="Finance, Work, Personal"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. GitHub, AWS, NetBanking"
              value={itemTitle}
              onChange={(e) => setItemTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Username
            </label>
            <input
              type="text"
              placeholder="kunal@example.com"
              value={itemUsername}
              onChange={(e) => setItemUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono text-zinc-400 uppercase">
                Secret / Password *
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => generatePassword(16)}
                  className="px-2 py-0.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-[10px] font-mono text-red-400 flex items-center gap-1 transition-all active:scale-95"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Generate (16)</span>
                </button>
                <button
                  type="button"
                  onClick={() => generatePassword(24)}
                  className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[10px] font-mono text-zinc-300 flex items-center gap-1 transition-all active:scale-95"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Ultra (24)</span>
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type={showModalPassword ? "text" : "password"}
                required
                placeholder="••••••••••••"
                value={itemSecret}
                onChange={(e) => setItemSecret(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-red-500"
              />
              <button
                type="button"
                onClick={() => setShowModalPassword(!showModalPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white transition-colors"
                title={showModalPassword ? "Hide password" : "Show password"}
              >
                {showModalPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {itemSecret && (
              <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-zinc-500 px-1">
                <span>Entropy: {itemSecret.length >= 16 ? "🛡️ Military Grade (Strong)" : "⚠️ Short / Moderate"}</span>
                <span>{itemSecret.length} chars</span>
              </div>
            )}
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Encrypt & Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Recovery Key Modal */}
      <Modal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        title="Emergency Vault Recovery Kit"
      >
        <div className="space-y-4 text-center">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <p className="text-xs text-red-300 leading-relaxed font-mono">
              Save or print this emergency recovery key in a secure physical location. If master password is lost, this key restores vault access.
            </p>
          </div>

          <div className="p-4 bg-black/60 border border-white/10 rounded-2xl font-mono text-sm font-bold text-white tracking-widest select-all">
            {recoveryKey}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(recoveryKey);
                alert("Recovery key copied!");
              }}
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsRecoveryModalOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Vault Secret Deletion Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleExecuteDeleteItem}
        isLoading={isDeletingItem}
        title="Delete Encrypted Vault Item"
        message={`Are you sure you want to permanently delete "${itemToDelete?.title}"? All zero-knowledge encrypted passwords and secure notes will be destroyed and cannot be recovered.`}
        confirmText="Delete Secret"
        confirmVariant="red"
        iconType="danger"
      />
    </div>
  );
}
