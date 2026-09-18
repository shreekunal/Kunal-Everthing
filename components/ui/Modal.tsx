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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark frosted backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Glass Dialog */}
      <div
        className={`relative w-full ${maxWidthStyles[maxWidth]} bg-black/95 border border-white/15 rounded-3xl shadow-glass-panel overflow-hidden z-10`}
      >
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/10 bg-white/[0.02]">
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
        <div className="p-6 max-h-[82vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
