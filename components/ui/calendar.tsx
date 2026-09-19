"use client";

import * as React from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  isValid,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

export interface CalendarProps {
  selected?: Date | string | null;
  onSelect?: (date: Date | null, dateString: string) => void;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
}

export function Calendar({
  selected,
  onSelect,
  className,
  minDate,
  maxDate,
}: CalendarProps) {
  const selectedDate = React.useMemo(() => {
    if (!selected) return null;
    if (selected instanceof Date) return isValid(selected) ? selected : null;
    try {
      const parsed = parseISO(selected);
      return isValid(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }, [selected]);

  const [currentMonth, setCurrentMonth] = React.useState<Date>(() => {
    return selectedDate || new Date();
  });

  // Keep view month in sync if selected changes externally
  React.useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate);
    }
  }, [selectedDate]);

  const prevMonth = () => {
    haptics.impactLight();
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const nextMonth = () => {
    haptics.impactLight();
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const handleSelectDay = (day: Date) => {
    haptics.selection();
    if (onSelect) {
      const formatted = format(day, "yyyy-MM-dd");
      onSelect(day, formatted);
    }
  };

  return (
    <div className={cn("p-3 w-full max-w-[280px] select-none font-mono", className)}>
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Previous Month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-xs font-bold text-white tracking-wide">
          {format(currentMonth, "MMMM yyyy")}
        </span>

        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Next Month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekdays Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {weekDays.map((d) => (
          <span key={d} className="text-[10px] text-zinc-500 font-bold py-0.5">
            {d}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

          let isDisabled = false;
          if (minDate && day < minDate && !isSameDay(day, minDate)) isDisabled = true;
          if (maxDate && day > maxDate && !isSameDay(day, maxDate)) isDisabled = true;

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={isDisabled}
              onClick={() => handleSelectDay(day)}
              className={cn(
                "h-8 w-8 rounded-lg text-xs flex items-center justify-center transition-all mx-auto",
                isSelected
                  ? "bg-brand-red text-white font-bold shadow-glow-red scale-105"
                  : isCurrentDay
                  ? "border border-brand-red/60 text-white font-bold bg-brand-red/10"
                  : isCurrentMonth
                  ? "text-zinc-200 hover:bg-white/10 hover:text-white"
                  : "text-zinc-600 hover:text-zinc-400",
                isDisabled && "opacity-25 pointer-events-none"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Quick Action Footer */}
      <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-white/10 text-[10px]">
        <button
          type="button"
          onClick={() => {
            const today = new Date();
            setCurrentMonth(today);
            handleSelectDay(today);
          }}
          className="text-brand-red hover:underline font-bold"
        >
          Today
        </button>
        {selectedDate && (
          <button
            type="button"
            onClick={() => {
              haptics.impactLight();
              if (onSelect) onSelect(null, "");
            }}
            className="text-zinc-500 hover:text-zinc-300"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
