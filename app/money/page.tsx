"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatINR } from "@/lib/formatters";
import {
  Wallet,
  CreditCard as CardIcon,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  PiggyBank,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Pencil,
  Minus,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
} from "lucide-react";
import { haptics } from "@/lib/haptics";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MoneyPage() {
  const [data, setData] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals for Accounts
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<any | null>(null);
  const [accountAdjustmentMode, setAccountAdjustmentMode] = useState<"ADJUST" | "SET_BALANCE">("ADJUST");
  const [accountAdjustmentType, setAccountAdjustmentType] = useState<string>("CREDIT");
  const [accountAdjustmentAmount, setAccountAdjustmentAmount] = useState<string>("");
  const [editAccountName, setEditAccountName] = useState<string>("");
  const [editAccountCategory, setEditAccountCategory] = useState<string>("BANK");
  const [editAccountType, setEditAccountType] = useState<string>("ASSET");
  const [editAccountBalance, setEditAccountBalance] = useState<string>("");
  const [accountToDelete, setAccountToDelete] = useState<any | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Form states - Create Account
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("ASSET");
  const [accountCategory, setAccountCategory] = useState("BANK");
  const [accountBalance, setAccountBalance] = useState("");

  // Modals & Form states - Credit Card
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [cardName, setCardName] = useState("");
  const [cardNetwork, setCardNetwork] = useState("VISA");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardLimit, setCardLimit] = useState("150000");
  const [cardStatementDate, setCardStatementDate] = useState("12");
  const [cardDueDate, setCardDueDate] = useState("30");
  const [cardOutstanding, setCardOutstanding] = useState("0");

  const [selectedCardForEdit, setSelectedCardForEdit] = useState<any | null>(null);
  const [cardToDelete, setCardToDelete] = useState<any | null>(null);
  const [isDeletingCard, setIsDeletingCard] = useState(false);

  // Modals & Form states - Debit Card
  const [isAddDebitCardOpen, setIsAddDebitCardOpen] = useState(false);
  const [debitCardName, setDebitCardName] = useState("");
  const [debitCardNumber, setDebitCardNumber] = useState("");
  const [debitCardExpiry, setDebitCardExpiry] = useState("");
  const [debitCardCvv, setDebitCardCvv] = useState("");
  const [debitCardNetwork, setDebitCardNetwork] = useState("VISA");
  const [debitCardNotes, setDebitCardNotes] = useState("");

  const [selectedDebitCardForEdit, setSelectedDebitCardForEdit] = useState<any | null>(null);
  const [debitCardToDelete, setDebitCardToDelete] = useState<any | null>(null);
  const [isDeletingDebitCard, setIsDeletingDebitCard] = useState(false);

  // Modals & Form states - Payment
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCardForPayment, setSelectedCardForPayment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentSourceId, setPaymentSourceId] = useState("");
  const [quickPayCard, setQuickPayCard] = useState<any | null>(null);
  const [isPayingQuick, setIsPayingQuick] = useState(false);

  // CVV Visibility & Clipboard Copy States
  const [showCvvMap, setShowCvvMap] = useState<{ [key: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Format Helper: MM/YY
  const formatExpiryInput = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  // Format Helper: Card Number with 4-digit groups
  const formatCardNumberInput = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 16);
    return raw.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const fetchFinancials = async () => {
    try {
      const [resMoney, resCards] = await Promise.all([
        fetch("/api/money"),
        fetch("/api/cards"),
      ]);
      if (resMoney.ok) {
        const json = await resMoney.json();
        setData(json);
      }
      if (resCards.ok) {
        const json = await resCards.json();
        setCards(json.cards || []);
      }
    } catch (err) {
      console.error("Money fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, []);

  // --- ACCOUNT HANDLERS ---
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName) return;

    try {
      await fetch("/api/money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accountName.trim(),
          type: accountType,
          category: accountCategory,
          balance: Number(accountBalance) || 0,
        }),
      });
      haptics.success();
      setAccountName("");
      setAccountBalance("");
      setIsAddAccountOpen(false);
      fetchFinancials();
    } catch (err) {
      console.error("Create account error:", err);
    }
  };

  const handleOpenEditAccount = (acc: any, defaultAdjustmentType?: string) => {
    haptics.selection();
    setSelectedAccountForEdit(acc);
    setEditAccountName(acc.name);
    setEditAccountCategory(acc.category);
    setEditAccountType(acc.type);
    setEditAccountBalance(String(acc.balance));
    setAccountAdjustmentAmount("");

    if (defaultAdjustmentType) {
      setAccountAdjustmentMode("ADJUST");
      setAccountAdjustmentType(defaultAdjustmentType);
    } else {
      setAccountAdjustmentMode("ADJUST");
      setAccountAdjustmentType(acc.type === "ASSET" ? "CREDIT" : "REDUCE");
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountForEdit || !editAccountName) return;

    try {
      let body: any = {
        name: editAccountName.trim(),
        category: editAccountCategory,
        type: editAccountType,
      };

      if (accountAdjustmentMode === "ADJUST" && accountAdjustmentAmount) {
        body.adjustmentType = accountAdjustmentType;
        body.adjustmentAmount = Number(accountAdjustmentAmount) || 0;
      } else {
        body.balance = Number(editAccountBalance) || 0;
      }

      const res = await fetch(`/api/money/${selectedAccountForEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        haptics.success();
        setSelectedAccountForEdit(null);
        fetchFinancials();
      }
    } catch (err) {
      console.error("Update account error:", err);
    }
  };

  const handleExecuteDeleteAccount = async () => {
    if (!accountToDelete) return;
    setIsDeletingAccount(true);
    haptics.warning();
    try {
      await fetch(`/api/money/${accountToDelete.id}`, { method: "DELETE" });
      setAccountToDelete(null);
      if (selectedAccountForEdit?.id === accountToDelete.id) {
        setSelectedAccountForEdit(null);
      }
      fetchFinancials();
    } catch (err) {
      console.error("Delete account error:", err);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // --- CREDIT CARD HANDLERS ---
  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName) return;

    try {
      await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cardName.trim(),
          bank: "", // No separate bank name required
          cardNumber: cardNumber ? cardNumber.replace(/\s+/g, "") : null,
          expiryDate: cardExpiry ? cardExpiry.trim() : null,
          cvv: cardCvv ? cardCvv.trim() : null,
          creditLimit: Number(cardLimit) || 100000,
          currentOutstanding: Number(cardOutstanding) || 0,
          statementDate: Number(cardStatementDate) || 12,
          dueDate: Number(cardDueDate) || 30,
        }),
      });
      haptics.success();
      setCardName("");
      setCardNumber("");
      setCardExpiry("");
      setCardCvv("");
      setCardLimit("150000");
      setCardOutstanding("0");
      setIsAddCardOpen(false);
      fetchFinancials();
    } catch (err) {
      console.error("Create card error:", err);
    }
  };

  const handleOpenEditCard = (card: any) => {
    haptics.selection();
    setSelectedCardForEdit({
      id: card.id,
      name: card.name,
      cardNumber: card.cardNumber ? formatCardNumberInput(card.cardNumber) : "",
      expiryDate: card.expiryDate || "",
      cvv: card.cvv || "",
      creditLimit: String(card.creditLimit || 100000),
      currentOutstanding: String(card.currentOutstanding || 0),
      statementDate: String(card.statementDate || 12),
      dueDate: String(card.dueDate || 30),
    });
  };

  const handleUpdateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardForEdit || !selectedCardForEdit.name) return;

    try {
      await fetch(`/api/cards/${selectedCardForEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedCardForEdit.name.trim(),
          bank: "",
          cardNumber: selectedCardForEdit.cardNumber
            ? selectedCardForEdit.cardNumber.replace(/\s+/g, "")
            : null,
          expiryDate: selectedCardForEdit.expiryDate
            ? selectedCardForEdit.expiryDate.trim()
            : null,
          cvv: selectedCardForEdit.cvv ? selectedCardForEdit.cvv.trim() : null,
          creditLimit: Number(selectedCardForEdit.creditLimit) || 100000,
          currentOutstanding: Number(selectedCardForEdit.currentOutstanding) || 0,
          statementDate: Number(selectedCardForEdit.statementDate) || 12,
          dueDate: Number(selectedCardForEdit.dueDate) || 30,
        }),
      });
      haptics.success();
      setSelectedCardForEdit(null);
      fetchFinancials();
    } catch (err) {
      console.error("Update card error:", err);
    }
  };

  const handleExecuteDeleteCard = async () => {
    if (!cardToDelete) return;
    setIsDeletingCard(true);
    haptics.warning();
    try {
      await fetch(`/api/cards/${cardToDelete.id}`, { method: "DELETE" });
      setCards((prev) => prev.filter((c) => c.id !== cardToDelete.id));
      setCardToDelete(null);
      fetchFinancials();
    } catch (err) {
      console.error("Delete card error:", err);
    } finally {
      setIsDeletingCard(false);
    }
  };

  const handleQuickPay = (card: any) => {
    if (!card.currentOutstanding || card.currentOutstanding <= 0) {
      haptics.impactLight();
      alert("This card has ₹0 outstanding balance!");
      return;
    }
    setQuickPayCard(card);
  };

  const handleExecuteQuickPay = async () => {
    if (!quickPayCard) return;
    setIsPayingQuick(true);
    haptics.success();
    try {
      await fetch(`/api/cards/${quickPayCard.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: quickPayCard.currentOutstanding,
        }),
      });
      setQuickPayCard(null);
      fetchFinancials();
    } catch (err) {
      console.error("Quick pay error:", err);
    } finally {
      setIsPayingQuick(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardForPayment || !paymentAmount) return;

    try {
      await fetch(`/api/cards/${selectedCardForPayment.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(paymentAmount),
          sourceAccountId: paymentSourceId || null,
        }),
      });
      setIsPaymentModalOpen(false);
      setPaymentAmount("");
      setSelectedCardForPayment(null);
      fetchFinancials();
    } catch (err) {
      console.error("Payment error:", err);
    }
  };

  // --- DEBIT CARD HANDLERS ---
  const handleCreateDebitCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debitCardName) return;

    try {
      await fetch("/api/cards/debit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: debitCardName.trim(),
          cardNumber: debitCardNumber ? debitCardNumber.replace(/\s+/g, "") : null,
          expiryDate: debitCardExpiry ? debitCardExpiry.trim() : null,
          cvv: debitCardCvv ? debitCardCvv.trim() : null,
          network: debitCardNetwork || "VISA",
          notes: debitCardNotes ? debitCardNotes.trim() : null,
        }),
      });
      haptics.success();
      setDebitCardName("");
      setDebitCardNumber("");
      setDebitCardExpiry("");
      setDebitCardCvv("");
      setDebitCardNotes("");
      setIsAddDebitCardOpen(false);
      fetchFinancials();
    } catch (err) {
      console.error("Create debit card error:", err);
    }
  };

  const handleOpenEditDebitCard = (card: any) => {
    haptics.selection();
    setSelectedDebitCardForEdit({
      id: card.id,
      name: card.name,
      cardNumber: card.cardNumber ? formatCardNumberInput(card.cardNumber) : "",
      expiryDate: card.expiryDate || "",
      cvv: card.cvv || "",
      network: card.network || "VISA",
      notes: card.notes || "",
    });
  };

  const handleUpdateDebitCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebitCardForEdit || !selectedDebitCardForEdit.name) return;

    try {
      await fetch(`/api/cards/debit/${selectedDebitCardForEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedDebitCardForEdit.name.trim(),
          cardNumber: selectedDebitCardForEdit.cardNumber
            ? selectedDebitCardForEdit.cardNumber.replace(/\s+/g, "")
            : null,
          expiryDate: selectedDebitCardForEdit.expiryDate
            ? selectedDebitCardForEdit.expiryDate.trim()
            : null,
          cvv: selectedDebitCardForEdit.cvv ? selectedDebitCardForEdit.cvv.trim() : null,
          network: selectedDebitCardForEdit.network || "VISA",
          notes: selectedDebitCardForEdit.notes ? selectedDebitCardForEdit.notes.trim() : null,
        }),
      });
      haptics.success();
      setSelectedDebitCardForEdit(null);
      fetchFinancials();
    } catch (err) {
      console.error("Update debit card error:", err);
    }
  };

  const handleExecuteDeleteDebitCard = async () => {
    if (!debitCardToDelete) return;
    setIsDeletingDebitCard(true);
    haptics.warning();
    try {
      await fetch(`/api/cards/debit/${debitCardToDelete.id}`, { method: "DELETE" });
      setDebitCardToDelete(null);
      fetchFinancials();
    } catch (err) {
      console.error("Delete debit card error:", err);
    } finally {
      setIsDeletingDebitCard(false);
    }
  };

  const { netWorth, totalAssets, totalLiabilities, totalCardOutstanding, accounts, debitCards = [] } =
    data || {};

  const assetAccounts = accounts?.filter((a: any) => a.type === "ASSET") || [];
  const liabilityAccounts = accounts?.filter((a: any) => a.type === "LIABILITY") || [];

  // Dynamic preview for Account adjustment
  const calculateAdjustedBalance = () => {
    if (!selectedAccountForEdit) return 0;
    const current = selectedAccountForEdit.balance || 0;
    const delta = Number(accountAdjustmentAmount) || 0;

    if (accountAdjustmentMode === "SET_BALANCE") {
      return Number(editAccountBalance) || 0;
    }

    if (selectedAccountForEdit.type === "ASSET") {
      if (accountAdjustmentType === "CREDIT") {
        return current + delta;
      } else {
        return Math.max(0, current - delta);
      }
    } else {
      // LIABILITY
      if (accountAdjustmentType === "REDUCE") {
        return Math.max(0, current - delta);
      } else {
        return current + delta;
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 text-red-400" />
            Financial Dashboard & Net Worth
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Accounts, debit cards, liabilities, credit card schedules & reconciliations
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => setIsAddAccountOpen(true)}>
            <Plus className="w-4 h-4" /> Account
          </Button>
          <Button variant="glass" size="sm" onClick={() => setIsAddDebitCardOpen(true)}>
            <Plus className="w-4 h-4 stroke-[2.5]" /> Debit Card
          </Button>
          <Button variant="red" size="sm" onClick={() => setIsAddCardOpen(true)}>
            <Plus className="w-4 h-4 stroke-[2.5]" /> Credit Card
          </Button>
        </div>
      </div>

      {/* Net Worth Hero Card */}
      <Card glow="red" className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <span className="text-xs text-zinc-500 font-mono uppercase tracking-wider block">
              Calculated Net Worth
            </span>
            <div className="text-3xl sm:text-4xl font-mono font-bold text-white mt-1">
              {formatINR(netWorth || 0)}
            </div>
            <p className="text-[11px] text-zinc-500 font-mono mt-1">
              Total Assets minus Total Liabilities
            </p>
          </div>

          <div className="flex items-center gap-4 bg-black/60 p-4 rounded-2xl border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 font-mono block">Total Assets</span>
              <span className="text-lg font-bold text-white font-mono">
                {formatINR(totalAssets || 0)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-black/60 p-4 rounded-2xl border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 font-mono block">Total Liabilities</span>
              <span className="text-lg font-bold text-red-400 font-mono">
                {formatINR(totalLiabilities || 0)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Credit Card Hub */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-white tracking-wider uppercase font-mono flex items-center gap-2">
            <CardIcon className="w-4 h-4 text-brand-red" />
            Credit Cards ({cards.length})
          </h3>
          <Button
            variant="glass"
            size="sm"
            onClick={() => setIsAddCardOpen(true)}
            className="text-xs h-7 px-2.5"
          >
            <Plus className="w-3.5 h-3.5" /> Card
          </Button>
        </div>

        {cards.length === 0 ? (
          <div className="p-8 text-center bg-white/[0.02] border border-white/5 rounded-2xl text-xs text-zinc-500 font-mono">
            No credit cards added. Click &apos;+ Credit Card&apos; above to track statements and due cycles.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => {
              const days = card.daysRemaining ?? 30;
              const isUrgent = days <= 3;
              const isWarning = days > 3 && days <= 15;
              const countdownBarColor = isUrgent
                ? "bg-red-500"
                : isWarning
                ? "bg-amber-400"
                : "bg-emerald-400";

              return (
                <Card
                  key={card.id}
                  glow={isUrgent ? "red" : undefined}
                  className="p-5 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {/* Only Card Name - No separate bank name */}
                        <h4 className="text-base font-bold text-white truncate">
                          {card.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {card.cardNumber ? (
                            <button
                              type="button"
                              onClick={() => {
                                haptics.impactLight();
                                navigator.clipboard.writeText(card.cardNumber.replace(/\s+/g, ""));
                                setCopiedId(`num-${card.id}`);
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
                              className="text-[11px] text-zinc-300 hover:text-white font-mono flex items-center gap-1 bg-white/[0.04] hover:bg-white/[0.08] px-2 py-0.5 rounded-md border border-white/10 transition-colors"
                              title="Click to copy full card number"
                            >
                              <span>{card.cardNumber}</span>
                              {copiedId === `num-${card.id}` ? (
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-2.5 h-2.5 text-zinc-500" />
                              )}
                            </button>
                          ) : card.last4 ? (
                            <span className="text-[10px] text-zinc-500 font-mono">
                              •••• {card.last4}
                            </span>
                          ) : null}

                          {/* Expiry Date Display */}
                          {card.expiryDate && (
                            <span className="text-[10px] font-mono text-zinc-300 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1">
                              <span className="text-zinc-500">EXP:</span>
                              <span className="font-bold text-white">{card.expiryDate}</span>
                            </span>
                          )}

                          {card.cvv && (
                            <button
                              type="button"
                              onClick={() => {
                                haptics.selection();
                                setShowCvvMap((prev) => ({
                                  ...prev,
                                  [card.id]: !prev[card.id],
                                }));
                              }}
                              className="text-[10px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/10"
                              title="Toggle CVV"
                            >
                              <span>CVV:</span>
                              <span className="font-bold text-brand-red">
                                {showCvvMap[card.id] ? card.cvv : "•••"}
                              </span>
                              {showCvvMap[card.id] ? (
                                <EyeOff className="w-2.5 h-2.5 text-zinc-500" />
                              ) : (
                                <Eye className="w-2.5 h-2.5 text-zinc-500" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Badge
                          variant={isUrgent ? "red" : isWarning ? "outline" : "outline"}
                          size="sm"
                        >
                          {card.dueDateLabel}
                        </Badge>
                        <button
                          onClick={() => handleOpenEditCard(card)}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-zinc-500 hover:text-white transition-all active:scale-90"
                          title="Edit card"
                          aria-label="Edit card"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            haptics.warning();
                            setCardToDelete(card);
                          }}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-zinc-500 hover:text-brand-red transition-all active:scale-90"
                          title="Delete card"
                          aria-label="Delete card"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Due Date Countdown Bar */}
                    <div className="mt-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                        <span className="flex items-center gap-1 text-zinc-400">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          {isUrgent ? "⚠️ Payment Urgent" : isWarning ? "Approaching Due" : "Safe Window"}
                        </span>
                        <span
                          className={`font-bold ${
                            isUrgent
                              ? "text-red-400 animate-pulse"
                              : isWarning
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {days} {days === 1 ? "day" : "days"} left
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${countdownBarColor}`}
                          style={{
                            width: `${Math.max(5, Math.min(100, ((30 - Math.min(30, days)) / 30) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* 30% Credit Utilization Warning Pill */}
                    <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                      {card.utilization > 30 ? (
                        <span className="px-2 py-0.5 rounded-lg bg-red-500/15 border border-red-500/30 text-[10px] font-mono font-bold text-red-400 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {card.utilization}% Used (&gt;30% Risk)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/10 text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                          🛡️ {card.utilization}% Used (Optimal)
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-zinc-500">
                        Limit: {formatINR(card.creditLimit || 0)}
                      </span>
                    </div>

                    {/* Statement & Due Dates */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10 text-xs font-mono">
                      <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-[10px] text-zinc-500 uppercase block mb-0.5">
                          Statement Date
                        </span>
                        <span className="font-bold text-white">
                          {card.statementDate}th of month
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-[10px] text-zinc-500 uppercase block mb-0.5">
                          Payment Due Date
                        </span>
                        <span className="font-bold text-brand-red">
                          {card.dueDate}th of month
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Outstanding & 1-Click Pay */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-mono block">
                        Outstanding
                      </span>
                      <span className="text-sm font-bold text-red-400 font-mono">
                        {formatINR(card.currentOutstanding || 0)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {card.currentOutstanding > 0 && (
                        <Button
                          variant="red"
                          size="sm"
                          className="text-[11px] h-7 px-2.5"
                          onClick={() => handleQuickPay(card)}
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>1-Click Paid</span>
                        </Button>
                      )}
                      <Button
                        variant="glass"
                        size="sm"
                        className="text-[11px] h-7 px-2"
                        onClick={() => {
                          setSelectedCardForPayment(card);
                          setPaymentAmount(
                            card.currentOutstanding ? String(card.currentOutstanding) : ""
                          );
                          setIsPaymentModalOpen(true);
                        }}
                      >
                        Pay
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Debit Cards Section (Moved from Vault to Money) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-white tracking-wider uppercase font-mono flex items-center gap-2">
            <CardIcon className="w-4 h-4 text-emerald-400" />
            Debit Cards ({debitCards.length})
          </h3>
          <Button
            variant="glass"
            size="sm"
            onClick={() => setIsAddDebitCardOpen(true)}
            className="text-xs h-7 px-2.5"
          >
            <Plus className="w-3.5 h-3.5" /> Debit Card
          </Button>
        </div>

        {debitCards.length === 0 ? (
          <div className="p-8 text-center bg-white/[0.02] border border-white/5 rounded-2xl text-xs text-zinc-500 font-mono">
            No debit cards added yet. Click &apos;+ Debit Card&apos; to securely store and quick-copy card details.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {debitCards.map((dCard: any) => {
              const isCopied = copiedId === `dcard-${dCard.id}`;
              const showCvv = showCvvMap[`debit-${dCard.id}`] || false;

              return (
                <Card
                  key={dCard.id}
                  className="p-5 flex flex-col justify-between group relative border-white/10 hover:border-emerald-500/30 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-white truncate">
                            {dCard.name}
                          </h4>
                          {dCard.network && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.05] border border-white/10 text-zinc-300">
                              {dCard.network}
                            </span>
                          )}
                        </div>

                        {dCard.notes && (
                          <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
                            {dCard.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleOpenEditDebitCard(dCard)}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-zinc-500 hover:text-white transition-all active:scale-90"
                          title="Edit debit card"
                          aria-label="Edit debit card"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            haptics.warning();
                            setDebitCardToDelete(dCard);
                          }}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-zinc-500 hover:text-brand-red transition-all active:scale-90"
                          title="Delete debit card"
                          aria-label="Delete debit card"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Card Details Box */}
                    <div className="mt-3.5 p-3 rounded-xl bg-black/60 border border-white/10 space-y-2.5 font-mono">
                      {/* 16-Digit Card Number */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-zinc-500 uppercase">Card Number</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-white font-bold tracking-wider">
                            {dCard.cardNumber
                              ? formatCardNumberInput(dCard.cardNumber)
                              : dCard.last4
                              ? `•••• •••• •••• ${dCard.last4}`
                              : "•••• •••• •••• ••••"}
                          </span>
                          {dCard.cardNumber && (
                            <button
                              type="button"
                              onClick={() => {
                                haptics.impactLight();
                                navigator.clipboard.writeText(dCard.cardNumber.replace(/\s+/g, ""));
                                setCopiedId(`dcard-${dCard.id}`);
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
                              className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/10"
                              title="Copy card number"
                            >
                              {isCopied ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expiry & CVV Row */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase block mb-0.5">
                            Valid Thru (EXP)
                          </span>
                          <span className="font-bold text-white">
                            {dCard.expiryDate || "—"}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-500 uppercase block mb-0.5">
                              CVV
                            </span>
                            {dCard.cvv && (
                              <button
                                type="button"
                                onClick={() => {
                                  haptics.selection();
                                  setShowCvvMap((prev) => ({
                                    ...prev,
                                    [`debit-${dCard.id}`]: !prev[`debit-${dCard.id}`],
                                  }));
                                }}
                                className="text-zinc-500 hover:text-zinc-300 p-0.5"
                                title="Toggle CVV"
                              >
                                {showCvv ? (
                                  <EyeOff className="w-2.5 h-2.5" />
                                ) : (
                                  <Eye className="w-2.5 h-2.5" />
                                )}
                              </button>
                            )}
                          </div>
                          <span className="font-bold text-emerald-400">
                            {dCard.cvv ? (showCvv ? dCard.cvv : "•••") : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Accounts Breakdown: Assets & Liabilities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assets List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-white" />
                <CardTitle>Asset Accounts ({assetAccounts.length})</CardTitle>
              </div>
              <span className="text-xs font-bold text-white font-mono">
                {formatINR(totalAssets || 0)}
              </span>
            </div>
          </CardHeader>

          <div className="divide-y divide-white/5">
            {assetAccounts.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500 font-mono">
                No asset accounts found. Click &apos;+ Account&apos; to add one.
              </div>
            ) : (
              assetAccounts.map((acc: any) => (
                <div
                  key={acc.id}
                  className="py-3.5 flex items-center justify-between gap-3 text-xs group hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{acc.name}</p>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {acc.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-white font-mono">
                      {formatINR(acc.balance)}
                    </span>

                    {/* Quick + Credit button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditAccount(acc, "CREDIT")}
                      className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-mono font-medium text-[10px] flex items-center gap-1 transition-all active:scale-95"
                      title="Add credit / deposit"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Credit</span>
                    </button>

                    {/* Edit Account */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditAccount(acc)}
                      className="p-1 text-zinc-500 hover:text-white transition-colors"
                      title="Edit account details"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>

                    {/* Delete Account */}
                    <button
                      type="button"
                      onClick={() => {
                        haptics.warning();
                        setAccountToDelete(acc);
                      }}
                      className="p-1 text-zinc-500 hover:text-brand-red transition-colors"
                      title="Delete account"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Liabilities List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-red-400" />
                <CardTitle>Liabilities & Loans</CardTitle>
              </div>
              <span className="text-xs font-bold text-red-400 font-mono">
                {formatINR(totalLiabilities || 0)}
              </span>
            </div>
          </CardHeader>

          <div className="divide-y divide-white/5">
            {/* Credit Cards Summary Row */}
            <div className="py-3.5 flex items-center justify-between text-xs px-2">
              <div>
                <p className="font-bold text-white">Credit Cards (Total Outstanding)</p>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {cards.length} Active Cards
                </span>
              </div>
              <span className="font-bold text-red-400 font-mono">
                {formatINR(totalCardOutstanding || 0)}
              </span>
            </div>

            {/* Custom Liability Accounts */}
            {liabilityAccounts.length === 0 ? (
              <div className="py-4 text-center text-xs text-zinc-500 font-mono">
                No standalone loans or liability accounts.
              </div>
            ) : (
              liabilityAccounts.map((acc: any) => (
                <div
                  key={acc.id}
                  className="py-3.5 flex items-center justify-between gap-3 text-xs group hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{acc.name}</p>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {acc.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-red-400 font-mono">
                      {formatINR(acc.balance)}
                    </span>

                    {/* Quick - Reduce liability button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditAccount(acc, "REDUCE")}
                      className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-mono font-medium text-[10px] flex items-center gap-1 transition-all active:scale-95"
                      title="Reduce liability / pay down"
                    >
                      <Minus className="w-2.5 h-2.5" />
                      <span>Reduce</span>
                    </button>

                    {/* Edit Liability */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditAccount(acc)}
                      className="p-1 text-zinc-500 hover:text-white transition-colors"
                      title="Edit liability details"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>

                    {/* Delete Liability */}
                    <button
                      type="button"
                      onClick={() => {
                        haptics.warning();
                        setAccountToDelete(acc);
                      }}
                      className="p-1 text-zinc-500 hover:text-brand-red transition-colors"
                      title="Delete liability"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* MODAL: Add Account */}
      <Modal
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
        title="Add Financial Account"
      >
        <form onSubmit={handleCreateAccount} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Account Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. HDFC Salary, Zerodha Funds, Gold"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Type
              </label>
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-black border-white/10 text-xs text-white font-mono">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASSET">Asset (Positive balance)</SelectItem>
                  <SelectItem value="LIABILITY">Liability (Debt / Loan)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Category
              </label>
              <Select value={accountCategory} onValueChange={setAccountCategory}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-black border-white/10 text-xs text-white font-mono">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK">Bank Account</SelectItem>
                  <SelectItem value="INVESTMENT">Investment / Mutual Fund</SelectItem>
                  <SelectItem value="FD">Fixed Deposit (FD)</SelectItem>
                  <SelectItem value="CASH">Physical Cash</SelectItem>
                  <SelectItem value="LOAN">Loan / Debt</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Current Balance (₹ INR)
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={accountBalance}
              onChange={(e) => setAccountBalance(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-red-500 font-mono"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setIsAddAccountOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Edit Account & Adjust Balance (Add Credit / Reduce Liability) */}
      <Modal
        isOpen={Boolean(selectedAccountForEdit)}
        onClose={() => setSelectedAccountForEdit(null)}
        title={
          selectedAccountForEdit?.type === "ASSET"
            ? "Edit Asset Account / Add Credit"
            : "Edit Liability / Reduce Debt"
        }
      >
        {selectedAccountForEdit && (
          <form onSubmit={handleUpdateAccount} className="space-y-4">
            {/* Account Info: Name & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase">
                  Account Name *
                </label>
                <input
                  type="text"
                  required
                  value={editAccountName}
                  onChange={(e) => setEditAccountName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase">
                  Category
                </label>
                <Select value={editAccountCategory} onValueChange={setEditAccountCategory}>
                  <SelectTrigger className="w-full h-9 rounded-xl bg-black border-white/10 text-xs text-white font-mono">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK">Bank Account</SelectItem>
                    <SelectItem value="INVESTMENT">Investment / Mutual Fund</SelectItem>
                    <SelectItem value="FD">Fixed Deposit (FD)</SelectItem>
                    <SelectItem value="CASH">Physical Cash</SelectItem>
                    <SelectItem value="LOAN">Loan / Debt</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Current Balance Display Banner */}
            <div className="p-3 bg-black/60 border border-white/10 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 font-mono uppercase block">
                  Current Balance
                </span>
                <span
                  className={`text-lg font-bold font-mono ${
                    selectedAccountForEdit.type === "ASSET" ? "text-white" : "text-red-400"
                  }`}
                >
                  {formatINR(selectedAccountForEdit.balance)}
                </span>
              </div>
              <Badge
                variant={selectedAccountForEdit.type === "ASSET" ? "outline" : "red"}
                size="sm"
              >
                {selectedAccountForEdit.type}
              </Badge>
            </div>

            {/* Mode Switcher: Quick Adjustment vs Set Exact Balance */}
            <div className="flex items-center gap-1.5 p-1 bg-black/80 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  haptics.selection();
                  setAccountAdjustmentMode("ADJUST");
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                  accountAdjustmentMode === "ADJUST"
                    ? "bg-brand-red text-white font-bold shadow-glow-red-subtle"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {selectedAccountForEdit.type === "ASSET"
                  ? "⚡ Quick Adjustment"
                  : "⚡ Reduce / Adjust Debt"}
              </button>
              <button
                type="button"
                onClick={() => {
                  haptics.selection();
                  setAccountAdjustmentMode("SET_BALANCE");
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                  accountAdjustmentMode === "SET_BALANCE"
                    ? "bg-brand-red text-white font-bold shadow-glow-red-subtle"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Set Exact Balance
              </button>
            </div>

            {/* Adjustment Section */}
            {accountAdjustmentMode === "ADJUST" ? (
              <div className="space-y-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2">
                  {selectedAccountForEdit.type === "ASSET" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          haptics.selection();
                          setAccountAdjustmentType("CREDIT");
                        }}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                          accountAdjustmentType === "CREDIT"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                            : "bg-white/[0.03] text-zinc-400 border-white/5"
                        }`}
                      >
                        + Add Credit (Deposit)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          haptics.selection();
                          setAccountAdjustmentType("DEBIT");
                        }}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                          accountAdjustmentType === "DEBIT"
                            ? "bg-red-500/20 text-red-400 border-red-500/50"
                            : "bg-white/[0.03] text-zinc-400 border-white/5"
                        }`}
                      >
                        - Deduct / Withdraw
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          haptics.selection();
                          setAccountAdjustmentType("REDUCE");
                        }}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                          accountAdjustmentType === "REDUCE"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                            : "bg-white/[0.03] text-zinc-400 border-white/5"
                        }`}
                      >
                        - Reduce Liability (Pay Off)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          haptics.selection();
                          setAccountAdjustmentType("INCREASE");
                        }}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                          accountAdjustmentType === "INCREASE"
                            ? "bg-red-500/20 text-red-400 border-red-500/50"
                            : "bg-white/[0.03] text-zinc-400 border-white/5"
                        }`}
                      >
                        + Borrow / Increase
                      </button>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase">
                    Adjustment Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 5000"
                    value={accountAdjustmentAmount}
                    onChange={(e) => setAccountAdjustmentAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-base font-mono font-bold text-white focus:outline-none focus:border-brand-red"
                    autoFocus
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-zinc-500 font-mono mr-1">Presets:</span>
                  {[1000, 5000, 10000, 25000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        haptics.impactLight();
                        setAccountAdjustmentAmount(String(amt));
                      }}
                      className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[10px] font-mono text-zinc-300 transition-colors"
                    >
                      +₹{(amt / 1000).toFixed(0)}k
                    </button>
                  ))}
                  {selectedAccountForEdit.type === "LIABILITY" &&
                    selectedAccountForEdit.balance > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          haptics.impactLight();
                          setAccountAdjustmentAmount(String(selectedAccountForEdit.balance));
                          setAccountAdjustmentType("REDUCE");
                        }}
                        className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-400 transition-colors"
                      >
                        Pay Full ({formatINR(selectedAccountForEdit.balance)})
                      </button>
                    )}
                </div>

                {/* Live Preview */}
                {accountAdjustmentAmount && (
                  <div className="p-3 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400">Calculated New Balance:</span>
                    <span
                      className={`text-sm font-bold ${
                        selectedAccountForEdit.type === "ASSET"
                          ? "text-emerald-400"
                          : calculateAdjustedBalance() === 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {formatINR(calculateAdjustedBalance())}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                  Exact New Balance (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editAccountBalance}
                  onChange={(e) => setEditAccountBalance(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-base font-mono font-bold text-white focus:outline-none focus:border-brand-red"
                />
              </div>
            )}

            <div className="pt-3 flex items-center justify-between gap-2 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => {
                  setAccountToDelete(selectedAccountForEdit);
                }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setSelectedAccountForEdit(null)}
                >
                  Cancel
                </Button>
                <Button variant="red" size="sm" type="submit">
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: Add Credit Card (No separate bank name, includes expiry date) */}
      <Modal
        isOpen={isAddCardOpen}
        onClose={() => setIsAddCardOpen(false)}
        title="Add Credit Card"
      >
        <form onSubmit={handleCreateCard} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Card Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. HDFC Millennia, ICICI Amazon Pay, SBI Cashback"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all"
              autoFocus
            />
          </div>

          {/* Card Number, Expiry Date & CVV */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Card Number (16 Digits)
              </label>
              <input
                type="text"
                maxLength={19}
                placeholder="4111 2222 3333 4444"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumberInput(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Expiry (MM/YY)
              </label>
              <input
                type="text"
                maxLength={5}
                placeholder="MM/YY"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(formatExpiryInput(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-brand-red text-center tracking-wider"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                CVV
              </label>
              <input
                type="password"
                maxLength={4}
                placeholder="•••"
                value={cardCvv}
                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-brand-red text-center tracking-widest"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Statement Day
              </label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={cardStatementDate}
                onChange={(e) => setCardStatementDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-brand-red"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Due Day
              </label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={cardDueDate}
                onChange={(e) => setCardDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-brand-red"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Credit Limit (₹)
              </label>
              <input
                type="number"
                min="0"
                value={cardLimit}
                onChange={(e) => setCardLimit(e.target.value)}
                placeholder="150000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-brand-red"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Outstanding (₹)
              </label>
              <input
                type="number"
                min="0"
                value={cardOutstanding}
                onChange={(e) => setCardOutstanding(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-brand-red"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
            <Button
              variant="glass"
              size="sm"
              type="button"
              onClick={() => setIsAddCardOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="red" size="sm" type="submit">
              Add Card
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Edit Credit Card */}
      <Modal
        isOpen={Boolean(selectedCardForEdit)}
        onClose={() => setSelectedCardForEdit(null)}
        title="Edit Credit Card"
      >
        {selectedCardForEdit && (
          <form onSubmit={handleUpdateCard} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Card Name *
              </label>
              <input
                type="text"
                required
                value={selectedCardForEdit.name}
                onChange={(e) =>
                  setSelectedCardForEdit({ ...selectedCardForEdit, name: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-brand-red"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                  Card Number (16 Digits)
                </label>
                <input
                  type="text"
                  maxLength={19}
                  placeholder="4111 2222 3333 4444"
                  value={selectedCardForEdit.cardNumber}
                  onChange={(e) =>
                    setSelectedCardForEdit({
                      ...selectedCardForEdit,
                      cardNumber: formatCardNumberInput(e.target.value),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-brand-red"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                  Expiry (MM/YY)
                </label>
                <input
                  type="text"
                  maxLength={5}
                  placeholder="MM/YY"
                  value={selectedCardForEdit.expiryDate}
                  onChange={(e) =>
                    setSelectedCardForEdit({
                      ...selectedCardForEdit,
                      expiryDate: formatExpiryInput(e.target.value),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-brand-red text-center tracking-wider"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                  CVV
                </label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="•••"
                  value={selectedCardForEdit.cvv}
                  onChange={(e) =>
                    setSelectedCardForEdit({
                      ...selectedCardForEdit,
                      cvv: e.target.value.replace(/\D/g, "").slice(0, 4),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-brand-red text-center tracking-widest"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                  Statement Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={selectedCardForEdit.statementDate}
                  onChange={(e) =>
                    setSelectedCardForEdit({
                      ...selectedCardForEdit,
                      statementDate: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-brand-red"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                  Due Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={selectedCardForEdit.dueDate}
                  onChange={(e) =>
                    setSelectedCardForEdit({
                      ...selectedCardForEdit,
                      dueDate: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-brand-red"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                  Credit Limit (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={selectedCardForEdit.creditLimit}
                  onChange={(e) =>
                    setSelectedCardForEdit({
                      ...selectedCardForEdit,
                      creditLimit: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-brand-red"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                  Outstanding (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={selectedCardForEdit.currentOutstanding}
                  onChange={(e) =>
                    setSelectedCardForEdit({
                      ...selectedCardForEdit,
                      currentOutstanding: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-brand-red"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setSelectedCardForEdit(null)}
              >
                Cancel
              </Button>
              <Button variant="red" size="sm" type="submit">
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: Add Debit Card (Moved from Vault to Money) */}
      <Modal
        isOpen={isAddDebitCardOpen}
        onClose={() => setIsAddDebitCardOpen(false)}
        title="Add Debit Card"
      >
        <form onSubmit={handleCreateDebitCard} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Card Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. HDFC Salary Platinum, SBI Global"
              value={debitCardName}
              onChange={(e) => setDebitCardName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Card Number (16 Digits)
              </label>
              <input
                type="text"
                maxLength={19}
                placeholder="4111 2222 3333 4444"
                value={debitCardNumber}
                onChange={(e) => setDebitCardNumber(formatCardNumberInput(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Expiry (MM/YY)
              </label>
              <input
                type="text"
                maxLength={5}
                placeholder="MM/YY"
                value={debitCardExpiry}
                onChange={(e) => setDebitCardExpiry(formatExpiryInput(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-emerald-500 text-center tracking-wider"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                CVV (3 Digits)
              </label>
              <input
                type="password"
                maxLength={3}
                placeholder="•••"
                value={debitCardCvv}
                onChange={(e) => setDebitCardCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-emerald-500 text-center tracking-widest"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Card Network
              </label>
              <Select value={debitCardNetwork} onValueChange={setDebitCardNetwork}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-black border-white/10 text-xs text-white font-mono">
                  <SelectValue placeholder="Network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VISA">VISA</SelectItem>
                  <SelectItem value="MASTERCARD">MasterCard</SelectItem>
                  <SelectItem value="RUPAY">RuPay</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="ATM limit ₹50k, linked to primary savings"
              value={debitCardNotes}
              onChange={(e) => setDebitCardNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
            <Button
              variant="glass"
              size="sm"
              type="button"
              onClick={() => setIsAddDebitCardOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              type="submit"
              className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40"
            >
              Save Debit Card
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Edit Debit Card */}
      <Modal
        isOpen={Boolean(selectedDebitCardForEdit)}
        onClose={() => setSelectedDebitCardForEdit(null)}
        title="Edit Debit Card"
      >
        {selectedDebitCardForEdit && (
          <form onSubmit={handleUpdateDebitCard} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Card Name *
              </label>
              <input
                type="text"
                required
                value={selectedDebitCardForEdit.name}
                onChange={(e) =>
                  setSelectedDebitCardForEdit({
                    ...selectedDebitCardForEdit,
                    name: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                  Card Number (16 Digits)
                </label>
                <input
                  type="text"
                  maxLength={19}
                  value={selectedDebitCardForEdit.cardNumber}
                  onChange={(e) =>
                    setSelectedDebitCardForEdit({
                      ...selectedDebitCardForEdit,
                      cardNumber: formatCardNumberInput(e.target.value),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                  Expiry (MM/YY)
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={selectedDebitCardForEdit.expiryDate}
                  onChange={(e) =>
                    setSelectedDebitCardForEdit({
                      ...selectedDebitCardForEdit,
                      expiryDate: formatExpiryInput(e.target.value),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 text-center tracking-wider"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                  CVV (3 Digits)
                </label>
                <input
                  type="password"
                  maxLength={3}
                  value={selectedDebitCardForEdit.cvv}
                  onChange={(e) =>
                    setSelectedDebitCardForEdit({
                      ...selectedDebitCardForEdit,
                      cvv: e.target.value.replace(/\D/g, "").slice(0, 3),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 text-center tracking-widest"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                  Card Network
                </label>
                <Select
                  value={selectedDebitCardForEdit.network}
                  onValueChange={(val) =>
                    setSelectedDebitCardForEdit({
                      ...selectedDebitCardForEdit,
                      network: val,
                    })
                  }
                >
                  <SelectTrigger className="w-full h-10 rounded-xl bg-black border-white/10 text-xs text-white font-mono">
                    <SelectValue placeholder="Network" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VISA">VISA</SelectItem>
                    <SelectItem value="MASTERCARD">MasterCard</SelectItem>
                    <SelectItem value="RUPAY">RuPay</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Notes
              </label>
              <input
                type="text"
                value={selectedDebitCardForEdit.notes}
                onChange={(e) =>
                  setSelectedDebitCardForEdit({
                    ...selectedDebitCardForEdit,
                    notes: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setSelectedDebitCardForEdit(null)}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                type="submit"
                className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40"
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Record Payment: ${selectedCardForPayment?.name || "Card"}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Payment Amount (₹) *
            </label>
            <input
              type="number"
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-base text-red-400 font-mono font-bold focus:outline-none focus:border-red-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Deduct from Bank Account (Optional)
            </label>
            <Select
              value={paymentSourceId || "NONE"}
              onValueChange={(val) => setPaymentSourceId(val === "NONE" ? "" : val)}
            >
              <SelectTrigger className="w-full h-10 rounded-xl bg-black border-white/10 text-xs text-white font-mono">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Do not deduct from bank</SelectItem>
                {assetAccounts.map((acc: any) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({formatINR(acc.balance)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Confirm Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Credit Card Deletion Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(cardToDelete)}
        onClose={() => setCardToDelete(null)}
        onConfirm={handleExecuteDeleteCard}
        isLoading={isDeletingCard}
        title="Delete Credit Card"
        message={`Are you sure you want to delete "${cardToDelete?.name}"? All associated billing cycles, outstandings, and limit trackers will be permanently removed.`}
        confirmText="Delete Card"
        confirmVariant="red"
        iconType="danger"
      />

      {/* Debit Card Deletion Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(debitCardToDelete)}
        onClose={() => setDebitCardToDelete(null)}
        onConfirm={handleExecuteDeleteDebitCard}
        isLoading={isDeletingDebitCard}
        title="Delete Debit Card"
        message={`Are you sure you want to delete "${debitCardToDelete?.name}"? Card details will be permanently removed.`}
        confirmText="Delete Debit Card"
        confirmVariant="red"
        iconType="danger"
      />

      {/* Account Deletion Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(accountToDelete)}
        onClose={() => setAccountToDelete(null)}
        onConfirm={handleExecuteDeleteAccount}
        isLoading={isDeletingAccount}
        title={`Delete ${accountToDelete?.type === "ASSET" ? "Asset Account" : "Liability Account"}`}
        message={`Are you sure you want to permanently delete "${accountToDelete?.name}" (${formatINR(accountToDelete?.balance || 0)})?`}
        confirmText="Delete Account"
        confirmVariant="red"
        iconType="danger"
      />

      {/* 1-Click Quick Pay Full Balance Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(quickPayCard)}
        onClose={() => setQuickPayCard(null)}
        onConfirm={handleExecuteQuickPay}
        isLoading={isPayingQuick}
        title="1-Click Mark Balance Paid"
        message={`Mark full outstanding balance of ${formatINR(quickPayCard?.currentOutstanding || 0)} on ${quickPayCard?.name} as settled & paid in full?`}
        confirmText="Confirm Settlement"
        confirmVariant="red"
        iconType="warning"
      />
    </div>
  );
}
