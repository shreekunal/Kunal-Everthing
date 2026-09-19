"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
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
  ShieldAlert,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";
import { haptics } from "@/lib/haptics";

export default function MoneyPage() {
  const [data, setData] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCardForPayment, setSelectedCardForPayment] = useState<any>(null);

  // Form states - Account
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("ASSET");
  const [accountCategory, setAccountCategory] = useState("BANK");
  const [accountBalance, setAccountBalance] = useState("");

  // Form states - Card
  const [cardName, setCardName] = useState("");
  const [cardBank, setCardBank] = useState("HDFC Bank");
  const [cardNetwork, setCardNetwork] = useState("VISA");
  const [cardLast4, setCardLast4] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [showCvvMap, setShowCvvMap] = useState<{ [key: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cardLimit, setCardLimit] = useState("150000");
  const [cardStatementDate, setCardStatementDate] = useState("12");
  const [cardDueDate, setCardDueDate] = useState("30");
  const [cardOutstanding, setCardOutstanding] = useState("0");

  // Form states - Payment
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentSourceId, setPaymentSourceId] = useState("");

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

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName) return;

    try {
      await fetch("/api/money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accountName,
          type: accountType,
          category: accountCategory,
          balance: Number(accountBalance) || 0,
        }),
      });
      setAccountName("");
      setAccountBalance("");
      setIsAddAccountOpen(false);
      fetchFinancials();
    } catch (err) {
      console.error("Create account error:", err);
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName) return;

    try {
      await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cardName,
          bank: cardBank || "Bank",
          cardNumber: cardNumber || null,
          cvv: cardCvv || null,
          creditLimit: Number(cardLimit) || 100000,
          currentOutstanding: Number(cardOutstanding) || 0,
          statementDate: Number(cardStatementDate) || 12,
          dueDate: Number(cardDueDate) || 30,
        }),
      });
      haptics.success();
      setCardName("");
      setCardBank("");
      setCardNumber("");
      setCardCvv("");
      setCardLimit("150000");
      setCardOutstanding("0");
      setIsAddCardOpen(false);
      fetchFinancials();
    } catch (err) {
      console.error("Create card error:", err);
    }
  };

  const handleQuickPayFullBalance = async (card: any) => {
    if (!card.currentOutstanding || card.currentOutstanding <= 0) {
      haptics.impactLight();
      alert("This card has ₹0 outstanding balance!");
      return;
    }

    if (
      !confirm(
        `Mark full balance of ${formatINR(card.currentOutstanding)} on ${card.name} as paid?`
      )
    )
      return;

    haptics.success();
    try {
      await fetch(`/api/cards/${card.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: card.currentOutstanding,
        }),
      });
      fetchFinancials();
    } catch (err) {
      console.error("Quick pay error:", err);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      fetchFinancials();
    } catch (err) {
      console.error("Delete card error:", err);
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


  const { netWorth, totalAssets, totalLiabilities, totalCardOutstanding, accounts } =
    data || {};

  const assetAccounts = accounts?.filter((a: any) => a.type === "ASSET") || [];
  const liabilityAccounts = accounts?.filter((a: any) => a.type === "LIABILITY") || [];

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
            Accounts balance, liabilities, credit card due schedules & reconciliations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setIsAddAccountOpen(true)}>
            <Plus className="w-4 h-4" /> Account
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsAddCardOpen(true)}>
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
            Credit Card Schedules ({cards.length})
          </h3>
        </div>

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
                      <h4 className="text-base font-bold text-white truncate">
                        {card.bank ? `${card.bank} ` : ""}{card.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
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

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge
                        variant={isUrgent ? "red" : isWarning ? "outline" : "outline"}
                        size="sm"
                      >
                        {card.dueDateLabel}
                      </Badge>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-brand-red transition-all"
                        title="Delete card"
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
                      <span className={`font-bold ${isUrgent ? "text-red-400 animate-pulse" : isWarning ? "text-amber-400" : "text-emerald-400"}`}>
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
                        onClick={() => handleQuickPayFullBalance(card)}
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
      </div>

      {/* Accounts Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assets List */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-white" />
              <CardTitle>Asset Accounts ({assetAccounts.length})</CardTitle>
            </div>
            <span className="text-xs font-bold text-white font-mono">
              {formatINR(totalAssets || 0)}
            </span>
          </CardHeader>

          <div className="divide-y divide-white/5">
            {assetAccounts.map((acc: any) => (
              <div
                key={acc.id}
                className="py-3.5 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-white">{acc.name}</p>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {acc.category}
                  </span>
                </div>
                <span className="font-bold text-white font-mono">
                  {formatINR(acc.balance)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Liabilities List */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-red-400" />
              <CardTitle>Liabilities & Loans</CardTitle>
            </div>
            <span className="text-xs font-bold text-red-400 font-mono">
              {formatINR(totalLiabilities || 0)}
            </span>
          </CardHeader>

          <div className="divide-y divide-white/5">
            <div className="py-3.5 flex items-center justify-between text-xs">
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

            {liabilityAccounts.map((acc: any) => (
              <div
                key={acc.id}
                className="py-3.5 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-white">{acc.name}</p>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {acc.category}
                  </span>
                </div>
                <span className="font-bold text-red-400 font-mono">
                  {formatINR(acc.balance)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Add Account Modal */}
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
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-sm text-white focus:outline-none focus:border-red-500 font-mono"
              >
                <option value="ASSET">Asset (Positive balance)</option>
                <option value="LIABILITY">Liability (Debt / Loan)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Category
              </label>
              <select
                value={accountCategory}
                onChange={(e) => setAccountCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-sm text-white focus:outline-none focus:border-red-500 font-mono"
              >
                <option value="BANK">Bank Account</option>
                <option value="INVESTMENT">Investment / Mutual Fund</option>
                <option value="FD">Fixed Deposit (FD)</option>
                <option value="CASH">Physical Cash</option>
                <option value="LOAN">Loan / Debt</option>
                <option value="OTHER">Other</option>
              </select>
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

      {/* Add Card Modal */}
      <Modal
        isOpen={isAddCardOpen}
        onClose={() => setIsAddCardOpen(false)}
        title="Add Credit Card"
      >
        <div className="space-y-4">
          <form onSubmit={handleCreateCard} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                  Card Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Millennia, Amazon Pay"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                  Bank Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank, ICICI"
                  value={cardBank}
                  onChange={(e) => setCardBank(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all"
                />
              </div>
            </div>

            {/* Card Number & CVV Fields */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                  Card Number (16 Digits)
                </label>
                <input
                  type="text"
                  maxLength={19}
                  placeholder="4111 2222 3333 4444"
                  value={cardNumber}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
                    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
                    setCardNumber(formatted);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all"
                />
              </div>
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                  Statement Day (1-31)
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
                  Payment Due Day (1-31)
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
                  Total Credit Limit (₹)
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
                  Current Due / Outstanding (₹)
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
        </div>
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
            <select
              value={paymentSourceId}
              onChange={(e) => setPaymentSourceId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-sm text-white focus:outline-none focus:border-red-500 font-mono"
            >
              <option value="">Do not deduct from bank</option>
              {assetAccounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatINR(acc.balance)})
                </option>
              ))}
            </select>
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
    </div>
  );
}
