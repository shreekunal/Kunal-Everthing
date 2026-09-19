"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle, Trash2, Skull } from "lucide-react";
import { haptics } from "@/lib/haptics";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "danger" | "red" | "glass";
  iconType?: "danger" | "warning" | "skull";
  requireText?: string;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed? This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "red",
  iconType = "warning",
  requireText,
  isLoading = false,
}: ConfirmDialogProps) {
  const [inputText, setInputText] = useState("");

  useEffect(() => {
    if (isOpen) {
      setInputText("");
      haptics.warning();
    }
  }, [isOpen]);

  const isConfirmDisabled = Boolean(requireText && inputText.trim().toUpperCase() !== requireText.trim().toUpperCase());

  const handleConfirm = async () => {
    if (isConfirmDisabled) return;
    haptics.impactMedium();
    await onConfirm();
  };

  const getIcon = () => {
    if (iconType === "skull") return <Skull className="w-5 h-5 text-brand-red" />;
    if (iconType === "danger") return <Trash2 className="w-5 h-5 text-brand-red" />;
    return <AlertTriangle className="w-5 h-5 text-amber-400" />;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center flex-shrink-0 shadow-glow-red-subtle mt-0.5">
            {getIcon()}
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">{message}</p>
          </div>
        </div>

        {requireText && (
          <div className="space-y-1.5 pt-1">
            <label className="block text-[11px] font-mono text-zinc-400 uppercase">
              Type <span className="font-bold text-brand-red">{requireText}</span> to confirm:
            </label>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Type "${requireText}"...`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red font-mono"
              autoFocus
            />
          </div>
        )}

        <div className="pt-3 flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-white/10">
          <Button
            variant="glass"
            size="sm"
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto text-xs py-2.5"
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            type="button"
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={isConfirmDisabled}
            className="w-full sm:w-auto text-xs py-2.5 font-bold shadow-glow-red"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
