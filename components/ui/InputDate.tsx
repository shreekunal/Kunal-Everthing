"use client";

import React, { useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { haptics } from "@/lib/haptics";

export interface InputDateProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  type?: "date" | "datetime-local";
  placeholder?: string;
  onChange?: (e: { target: { value: string } }) => void;
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
  const [open, setOpen] = useState(false);
  const isDateTime = type === "datetime-local";
  const defaultPlaceholder = isDateTime ? "Select date & time..." : "Select date...";
  const displayPlaceholder = placeholder || defaultPlaceholder;
  const stringVal = value ? String(value) : "";

  // Format date display for user friendly readability
  const formattedDisplay = React.useMemo(() => {
    if (!stringVal) return "";
    try {
      if (isDateTime) {
        // e.g. "2026-09-19T14:30"
        const [dPart, tPart] = stringVal.split("T");
        if (dPart) {
          const parsedDate = parseISO(dPart);
          if (isValid(parsedDate)) {
            return `${format(parsedDate, "dd MMM yyyy")}${tPart ? ` at ${tPart}` : ""}`;
          }
        }
      } else {
        const parsedDate = parseISO(stringVal);
        if (isValid(parsedDate)) {
          return format(parsedDate, "dd MMM yyyy");
        }
      }
      return stringVal;
    } catch {
      return stringVal;
    }
  }, [stringVal, isDateTime]);

  // For datetime-local, extract date and time components
  const [timeValue, setTimeValue] = useState<string>(() => {
    if (isDateTime && stringVal && stringVal.includes("T")) {
      return stringVal.split("T")[1] || "09:00";
    }
    return "09:00";
  });

  const handleSelectDate = (_: Date | null, dateString: string) => {
    if (!dateString) {
      if (onChange) onChange({ target: { value: "" } });
      setOpen(false);
      return;
    }

    if (isDateTime) {
      const combined = `${dateString}T${timeValue}`;
      if (onChange) onChange({ target: { value: combined } });
    } else {
      if (onChange) onChange({ target: { value: dateString } });
      setOpen(false);
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTimeValue(newTime);
    const datePart = stringVal ? stringVal.split("T")[0] : format(new Date(), "yyyy-MM-dd");
    const combined = `${datePart}T${newTime}`;
    if (onChange) onChange({ target: { value: combined } });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onClick={() => haptics.impactLight()}
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-xl border border-white/10 bg-black/80 px-3.5 py-2 text-xs sm:text-sm font-mono text-white placeholder:text-zinc-500 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red disabled:cursor-not-allowed disabled:opacity-50 transition-all text-left group min-h-[44px]",
            !formattedDisplay && "text-zinc-500",
            className
          )}
        >
          <span className="truncate">{formattedDisplay || displayPlaceholder}</span>
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            {formattedDisplay && !disabled && (
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  haptics.impactLight();
                  if (onChange) onChange({ target: { value: "" } });
                }}
                className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                title="Clear date"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            {isDateTime ? (
              <Clock className="w-4 h-4 text-brand-red group-hover:scale-105 transition-transform" />
            ) : (
              <CalendarIcon className="w-4 h-4 text-brand-red group-hover:scale-105 transition-transform" />
            )}
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto p-0 border border-white/15 bg-zinc-950/95 shadow-2xl backdrop-blur-2xl rounded-2xl"
        align="start"
      >
        <Calendar
          selected={stringVal ? (stringVal.includes("T") ? stringVal.split("T")[0] : stringVal) : undefined}
          onSelect={handleSelectDate}
        />

        {/* Optional Time Selector for datetime-local */}
        {isDateTime && (
          <div className="p-3 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-brand-red" />
              Time:
            </span>
            <input
              type="time"
              value={timeValue}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="px-2 py-1 rounded-lg bg-black border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-brand-red"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1 rounded-lg bg-brand-red text-white text-xs font-mono font-bold hover:bg-brand-redDark shadow-glow-red"
            >
              Done
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
