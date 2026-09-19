"use client";

import * as React from "react";
import { format, isValid, parseISO } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { haptics } from "@/lib/haptics";

export interface DatePickerProps {
  value?: string | Date | null;
  onChange?: (dateString: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const formattedDate = React.useMemo(() => {
    if (!value) return null;
    try {
      const dateObj = typeof value === "string" ? parseISO(value) : value;
      return isValid(dateObj) ? format(dateObj, "dd MMM yyyy") : null;
    } catch {
      return null;
    }
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onClick={() => haptics.impactLight()}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-xl border border-white/10 bg-black/80 px-3.5 py-2 text-xs font-mono text-white placeholder:text-zinc-500 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red disabled:cursor-not-allowed disabled:opacity-50 transition-all text-left",
            !formattedDate && "text-zinc-500",
            className
          )}
        >
          <span className="truncate">{formattedDate || placeholder}</span>
          <CalendarIcon className="ml-2 h-4 w-4 shrink-0 text-brand-red opacity-80" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border border-white/15 bg-zinc-950/95 shadow-2xl backdrop-blur-2xl"
        align="start"
      >
        <Calendar
          selected={value || undefined}
          onSelect={(_, dateStr) => {
            if (onChange) onChange(dateStr);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
