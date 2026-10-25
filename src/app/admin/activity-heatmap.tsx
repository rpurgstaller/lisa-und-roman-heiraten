import { useEffect, useRef } from "react";
import type { ResponseLogRow } from "../lib/database.types";

const weeksToShow = 52;
const weekdayLabels = ["Mo", "", "Mi", "", "Fr", "", ""];
const levelClassNames = [
  "bg-[#eee9de]",
  "bg-[#d5e0c8]",
  "bg-[#a6bb92]",
  "bg-[#73906a]",
  "bg-[#4d594a]",
];

const dayLabelFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const monthFormatter = new Intl.DateTimeFormat("de-DE", { month: "short" });

type HeatmapDay = {
  key: string;
  date: Date;
  count: number;
  level: number;
  isFuture: boolean;
};

type HeatmapWeek = {
  key: string;
  monthLabel: string | null;
  days: HeatmapDay[];
};

export function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDayLabel(date: Date): string {
  return dayLabelFormatter.format(date);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function getMonday(date: Date): Date {
  return addDays(date, -((date.getDay() + 6) % 7));
}

function getLevel(count: number, maxCount: number): number {
  if (count === 0) {
    return 0;
  }

  return Math.min(4, Math.ceil((count / maxCount) * 4));
}

function buildWeeks(
  counts: Map<string, number>,
  firstMonday: Date,
  lastMonday: Date,
  todayKey: string,
  maxCount: number
): HeatmapWeek[] {
  const weeks: HeatmapWeek[] = [];

  for (
    let monday = firstMonday;
    monday.getTime() <= lastMonday.getTime();
    monday = addDays(monday, 7)
  ) {
    const days: HeatmapDay[] = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(monday, index);
      const key = toDayKey(date);
      const count = counts.get(key) ?? 0;

      return {
        key,
        date,
        count,
        level: getLevel(count, maxCount),
        isFuture: key > todayKey,
      };
    });
    // Month labels sit above the week that contains the 1st of a month.
    const firstOfMonth = days.find((day) => day.date.getDate() === 1);

    weeks.push({
      key: toDayKey(monday),
      monthLabel: firstOfMonth ? monthFormatter.format(firstOfMonth.date) : null,
      days,
    });
  }

  return weeks;
}

export default function ActivityHeatmap({
  entries,
  selectedDate,
  onSelectDate,
}: {
  entries: ResponseLogRow[];
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const todayKey = toDayKey(today);
  const counts = new Map<string, number>();
  let earliestMonday = getMonday(today);

  for (const entry of entries) {
    const changedAt = new Date(entry.changed_at);
    const key = toDayKey(changedAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);

    const monday = getMonday(changedAt);
    if (monday.getTime() < earliestMonday.getTime()) {
      earliestMonday = monday;
    }
  }

  const maxCount = Math.max(1, ...Array.from(counts.values()));
  const currentMonday = getMonday(today);
  const oneYearAgoMonday = addDays(currentMonday, -7 * (weeksToShow - 1));
  const firstMonday =
    earliestMonday.getTime() < oneYearAgoMonday.getTime()
      ? earliestMonday
      : oneYearAgoMonday;
  const weeks = buildWeeks(counts, firstMonday, currentMonday, todayKey, maxCount);
  const selectedKey = selectedDate ? toDayKey(selectedDate) : null;

  useEffect(() => {
    const element = scrollRef.current;

    if (element) {
      element.scrollLeft = element.scrollWidth;
    }
  }, []);

  return (
    <section
      aria-labelledby="activity-heatmap-heading"
      className="border border-[#c8cfc2] bg-white/60 p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="activity-heatmap-heading"
          className="font-serif text-2xl text-[#394438]"
        >
          Änderungen pro Tag
        </h2>
        <p className="text-xs text-[#657061]">
          Tag anklicken, um die Liste darunter zu filtern
        </p>
      </div>

      <div ref={scrollRef} className="mt-5 overflow-x-auto pb-2">
        <div className="flex w-max gap-2">
          <div
            aria-hidden="true"
            className="flex flex-col gap-[3px] pt-4 text-[10px] leading-3 text-[#7b876f]"
          >
            {weekdayLabels.map((label, index) => (
              <span key={index} className="h-3">
                {label}
              </span>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {weeks.map((week) => (
              <div key={week.key} className="flex flex-col gap-[3px]">
                <span className="h-4 whitespace-nowrap text-[10px] leading-4 text-[#7b876f]">
                  {week.monthLabel ?? ""}
                </span>
                {week.days.map((day) => {
                  if (day.isFuture) {
                    return <span key={day.key} aria-hidden="true" className="h-3 w-3" />;
                  }

                  const isSelected = day.key === selectedKey;
                  const countLabel = `${day.count} ${day.count === 1 ? "Änderung" : "Änderungen"}`;

                  return (
                    <button
                      key={day.key}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`${formatDayLabel(day.date)}: ${countLabel}`}
                      title={`${formatDayLabel(day.date)}: ${countLabel}`}
                      onClick={() => onSelectDate(isSelected ? null : day.date)}
                      className={`h-3 w-3 rounded-[2px] ${levelClassNames[day.level]} transition-shadow hover:ring-1 hover:ring-[#394438] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#4d594a] ${
                        isSelected ? "ring-2 ring-[#394438] ring-offset-1" : ""
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 text-xs text-[#657061]">
        <span>Weniger</span>
        {levelClassNames.map((className) => (
          <span
            key={className}
            aria-hidden="true"
            className={`h-3 w-3 rounded-[2px] ${className}`}
          />
        ))}
        <span>Mehr</span>
      </div>
    </section>
  );
}
