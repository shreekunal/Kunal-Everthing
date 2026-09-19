"use client";

import React, { useRef } from "react";
import { Calendar, Clock } from "lucide-react";

interface InputDateProps extends React.InputHTMLAttributes<HTMLInputElement> {
  type?: "date" | "datetime-local";
  placeholder?: string;
}

export function InputDate({
  type = "date",
  value,
  placeholder,
  onChange,
  className = "",
  disabled,
  required,
  ...props
}: InputDateProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isDateTime = type === "datetime-local";
  const defaultPlaceholder = isDateTime ? "Select date & time..." : "Select date...";
  const displayPlaceholder = placeholder || defaultPlaceholder;
  const hasValue = Boolean(value && String(value).trim().length > 0);

  const handleContainerClick = () => {
    if (disabled) return;
    if (inputRef.current) {
      inputRef.current.focus();
      try {
        // Modern Android / Chrome native picker trigger
        (inputRef.current as any).showPicker?.();
      } catch {
        // Fallback to normal focus
      }
    }
  };

  return (
    <div
      onClick={handleContainerClick}
      className="relative w-full cursor-pointer select-none"
    >
      {/* Fallback visible placeholder for mobile WebView where empty date input is blank */}
      {!hasValue && (
        <div className="absolute inset-y-0 left-3.5 right-10 flex items-center pointer-events-none text-zinc-500 font-mono text-xs sm:text-sm truncate">
          <span>{displayPlaceholder}</span>
        </div>
      )}

      {/* Trailing Icon (Calendar or Clock) */}
      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-brand-red">
        {isDateTime ? (
          <Clock className="w-4 h-4 text-brand-red" />
        ) : (
          <Calendar className="w-4 h-4 text-brand-red" />
        )}
      </div>

      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-xs sm:text-sm font-mono focus:outline-none focus:border-brand-red transition-all min-h-[44px] cursor-pointer appearance-none ${
          hasValue ? "text-white" : "text-transparent"
        } ${className}`}
        style={{
          colorScheme: "dark",
        }}
        {...props}
      />
    </div>
  );
}
