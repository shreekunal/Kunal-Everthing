import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "lg",
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Dark frosted backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Glass Dialog / Mobile Bottom Sheet */}
      <div
        className={`relative w-full ${maxWidthStyles[maxWidth]} bg-black/95 border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-glass-panel overflow-hidden z-10 max-h-[88dvh] sm:max-h-[85vh] flex flex-col pb-safe overscroll-contain`}
      >
        {/* Mobile Swipe / Grab Indicator */}
        <div className="pt-2 sm:hidden flex justify-center">
          <div className="w-12 h-1 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 bg-white/[0.02] flex-shrink-0">
          <h2 className="text-sm font-bold tracking-wide text-white font-mono uppercase">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 sm:p-6 pb-10 sm:pb-6 overflow-y-auto flex-1 overscroll-contain">{children}</div>
      </div>
    </div>
  );
}
