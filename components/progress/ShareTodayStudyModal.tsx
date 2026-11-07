"use client";

import React, { useRef, useState } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { toPng } from "html-to-image";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import {
  Heart,
  X,
  AlertCircle,
  CheckCircle2,
  Zap,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDuration } from "@/lib/formatters";
import { haptics } from "@/lib/haptics";

export interface ShareTodayStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerLabel: string;
  partnerPhone?: string | null;
  todayStudyMinutes: number;
  todayEarnedXP: number;
  todayStudySessionsCount: number;
  weekStudyMinutes: number;
}

export function ShareTodayStudyModal({
  isOpen,
  onClose,
  partnerLabel,
  partnerPhone,
  todayStudyMinutes,
  todayEarnedXP,
  todayStudySessionsCount,
  weekStudyMinutes,
}: ShareTodayStudyModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [shareStatus, setShareStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleSendToPartner = async () => {
    if (!shareCardRef.current) return;
    setIsExporting(true);
    setShareStatus(null);
    haptics.selection();

    try {
      const dataUrl = await toPng(shareCardRef.current, {
        pixelRatio: 2.5,
        backgroundColor: "#09090b",
      });

      const todayStr = format(new Date(), "yyyy-MM-dd");
      const fileName = `Everthing-focus-${todayStr}.png`;
      const base64Data = dataUrl.split(",")[1];

      if (Capacitor.isNativePlatform()) {
        const fileResult = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        await Share.share({
          title: `Study Flow — ${todayStr}`,
          text: `Hey ${partnerLabel}! Here is my study focus for today: ${formatDuration(todayStudyMinutes)} logged.`,
          url: fileResult.uri,
          dialogTitle: `Share with ${partnerLabel}`,
        });
        haptics.success();
        setShareStatus({ text: `Shared card with ${partnerLabel}!` });
      } else {
        if (navigator.share && navigator.canShare) {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], fileName, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Study Flow — ${todayStr}`,
              text: `Hey ${partnerLabel}! Here is my study focus for today.`,
            });
            haptics.success();
            setShareStatus({ text: `Shared with ${partnerLabel}!` });
            return;
          }
        }

        const encodedMsg = encodeURIComponent(
          `Hey ${partnerLabel}! Today I logged ${formatDuration(todayStudyMinutes)} of study focus on Everthing. Consistency is mastery!`
        );
        const waUrl = partnerPhone
          ? `https://wa.me/${partnerPhone.replace(/[^0-9]/g, "")}?text=${encodedMsg}`
          : `https://wa.me/?text=${encodedMsg}`;
        window.open(waUrl, "_blank");
        haptics.success();
        setShareStatus({ text: "Opened WhatsApp to send study summary." });
      }
    } catch (err: any) {
      if (err?.message !== "Share canceled" && err?.name !== "AbortError") {
        console.error("Export/Share error:", err);
        setShareStatus({ text: "Failed to generate share image.", error: true });
        haptics.error();
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-zinc-950 border border-white/10 rounded-3xl p-5 shadow-2xl my-8">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-400 fill-rose-500/20" />
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              Send to {partnerLabel}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg bg-white/5 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {shareStatus && (
          <div
            className={clsx(
              "my-3 p-2.5 rounded-xl text-xs font-mono flex items-center gap-2",
              shareStatus.error
                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            )}
          >
            {shareStatus.error ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{shareStatus.text}</span>
          </div>
        )}

        {/* Preview Card */}
        <div className="flex justify-center my-3 overflow-hidden">
          <div
            ref={shareCardRef}
            style={{
              background: "radial-gradient(ellipse at top, #1f1214 0%, #09090b 70%)",
              boxShadow: "0 0 40px rgba(239, 68, 68, 0.15)",
            }}
            className="w-full border border-red-500/30 rounded-2xl p-5 text-white select-none"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
                <span className="font-mono font-bold tracking-widest text-[11px] text-white">EVERTHING</span>
              </div>
              <span className="text-[9px] font-mono text-zinc-400">{format(new Date(), "dd MMM yyyy")}</span>
            </div>

            <div className="mt-4 mb-3">
              <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 block">
                Today&apos;s Focus
              </span>
              <div className="text-3xl font-black font-mono text-white tracking-tight mt-0.5">
                {formatDuration(todayStudyMinutes)}
              </div>
              <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-mono font-bold">
                <Zap className="w-2.5 h-2.5 text-brand-red" />
                <span>+{todayEarnedXP} XP Yield</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 py-2 border-y border-white/10 text-center font-mono">
              <div className="p-1.5 rounded-lg bg-white/[0.03]">
                <span className="text-[8px] text-zinc-500 block uppercase">Sessions</span>
                <span className="text-xs font-bold text-white block mt-0.5">{todayStudySessionsCount}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white/[0.03]">
                <span className="text-[8px] text-zinc-500 block uppercase">Week Total</span>
                <span className="text-xs font-bold text-white block mt-0.5">{formatDuration(weekStudyMinutes)}</span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[8px] font-mono text-zinc-500">
              <span>Consistency is mastery.</span>
              <span className="text-rose-400 font-bold">Everthing • {partnerLabel}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            variant="red"
            size="sm"
            disabled={isExporting}
            onClick={handleSendToPartner}
            className="py-2 text-xs font-semibold shadow-glow-red"
          >
            <Heart className="w-3.5 h-3.5 text-rose-300" />
            <span>Send</span>
          </Button>

          <Button
            variant="white"
            size="sm"
            disabled={isExporting}
            onClick={async () => {
              if (!shareCardRef.current) return;
              setIsExporting(true);
              try {
                const dataUrl = await toPng(shareCardRef.current, { pixelRatio: 2.5, backgroundColor: "#09090b" });
                const link = document.createElement("a");
                link.download = `Everthing-study-${format(new Date(), "yyyy-MM-dd")}.png`;
                link.href = dataUrl;
                link.click();
                haptics.success();
              } catch (e) {
                haptics.error();
              } finally {
                setIsExporting(false);
              }
            }}
            className="py-2 text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
