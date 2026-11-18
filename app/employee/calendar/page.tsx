"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Badge, Btn, Card, PageHeader } from "@/components/ui";
import { DAYS_SHORT, MONTHS, pad } from "@/lib/dates";
import { cn } from "@/lib/cn";

interface Holiday {
  id: number;
  name: string;
  date: string;
  kind: string;
}

interface LeaveItem {
  id: number;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: string;
}

interface WfhItem {
  id: number;
  date: string;
  reason: string;
  status: string;
}

export default function EmployeeCalendarPage() {
  const [ym, setYm] = useState({ y: 2026, m: 10 }); // 10 = November (0-based)
  const [loading, setLoading] = useState(true);

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [wfhList, setWfhList] = useState<WfhItem[]>([]);
  const [filterType, setFilterType] = useState<"all" | "holiday" | "leave" | "wfh">("all");
  const [selectedDate, setSelectedDate] = useState<string>("2026-11-18");

  const fetchCalendarData = async () => {
    try {
      const year = ym.y;
      const month = ym.m + 1;
      const res = await fetch(`/api/hr/calendar?year=${year}&month=${month}`);
      const json = await res.json();
      if (json?.success) {
        setHolidays(json.holidays || []);

        // Filter leaves and WFH for current user or show relevant
        setLeaves(json.leaves || []);
        setWfhList(json.wfh || []);
      }
    } catch (err) {
      console.error("Failed to load calendar data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, [ym]);

  // Build matrix
  const first = new Date(ym.y, ym.m, 1);
  const totalDays = new Date(ym.y, ym.m + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // Mon = 0
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const monthKey = `${ym.y}-${pad(ym.m + 1)}`;
  const stepMonth = (delta: number) => {
    const nextDate = new Date(ym.y, ym.m + delta, 1);
    setYm({ y: nextDate.getFullYear(), m: nextDate.getMonth() });
  };

  const getEventsForDate = (dateStr: string) => {
    const h = holidays.filter((h) => h.date === dateStr);
    const l = leaves.filter((l) => l.from <= dateStr && dateStr <= l.to);
    const w = wfhList.filter((w) => w.date === dateStr);

    const events: { label: string; type: "holiday" | "leave" | "wfh"; color: string }[] = [];
    if (filterType === "all" || filterType === "holiday") {
      h.forEach((item) => events.push({ label: item.name, type: "holiday", color: "bg-amber-100 text-amber-800 border-amber-200" }));
    }
    if (filterType === "all" || filterType === "leave") {
      l.forEach((item) => events.push({ label: `${item.type} leave`, type: "leave", color: "bg-rose-100 text-rose-800 border-rose-200" }));
    }
    if (filterType === "all" || filterType === "wfh") {
      w.forEach(() => events.push({ label: "Work from home", type: "wfh", color: "bg-sky-100 text-sky-800 border-sky-200" }));
    }
    return events;
  };

  const selEvents = getEventsForDate(selectedDate);

  return (
    <>
      <PageHeader
        title="Calendar"
        sub="Company holidays, approved leaves, and your work schedule in one view."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "holiday", "leave", "wfh"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              filterType === t
                ? "border-pine bg-pine text-white"
                : "border-line bg-white text-slate-700 hover:bg-canvas"
            )}
          >
            {t === "all" ? "All events" : t === "holiday" ? "Holidays" : t === "leave" ? "My leaves" : "WFH"}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        {/* Calendar Grid */}
        <Card flush>
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="text-base font-semibold text-slate-900">
              {MONTHS[ym.m]} {ym.y}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                className="btn-ghost btn-sm"
                onClick={() => setYm({ y: 2026, m: 10 })}
              >
                Today
              </button>
              <button
                className="btn-ghost btn-sm"
                aria-label="Previous month"
                onClick={() => stepMonth(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                className="btn-ghost btn-sm"
                aria-label="Next month"
                onClick={() => stepMonth(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-line text-center text-xs font-semibold text-mute">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="py-2.5">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-line">
            {cells.map((d, i) => {
              const dateStr = d ? `${monthKey}-${pad(d)}` : "";
              const ev = d ? getEventsForDate(dateStr) : [];
              const isSelected = dateStr === selectedDate;
              const isWeekend = i % 7 === 5 || i % 7 === 6;

              return (
                <div
                  key={i}
                  onClick={() => d && setSelectedDate(dateStr)}
                  className={cn(
                    "min-h-24 p-2 transition cursor-pointer flex flex-col justify-between",
                    !d ? "bg-slate-50/50 cursor-default" : isSelected ? "bg-pine-soft ring-1 ring-inset ring-pine" : isWeekend ? "bg-slate-50/80" : "hover:bg-canvas"
                  )}
                >
                  <div className="flex items-center justify-between">
                    {d && (
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                          isSelected ? "bg-pine font-semibold text-white" : "text-slate-700"
                        )}
                      >
                        {d}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 space-y-1">
                    {ev.slice(0, 2).map((e, idx) => (
                      <div
                        key={idx}
                        className={cn("truncate rounded border px-1.5 py-0.5 text-[10px] font-medium leading-tight", e.color)}
                        title={e.label}
                      >
                        {e.label}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Date Summary */}
          <div className="border-t border-line bg-canvas p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-mute">
              Schedule on {selectedDate}
            </h4>
            {selEvents.length === 0 ? (
              <p className="mt-1 text-sm text-mute">Standard working day. No leaves or holidays.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {selEvents.map((e, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-slate-800">
                    <span className={cn("inline-block h-2 w-2 rounded-full", e.type === "holiday" ? "bg-amber-500" : e.type === "leave" ? "bg-rose-500" : "bg-sky-500")} />
                    <span className="font-medium">{e.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Side Column: Holidays List */}
        <Card title="Upcoming holidays">
          <ul className="divide-y divide-line text-sm">
            {holidays.length === 0 ? (
              <li className="py-3 text-mute">No holidays scheduled.</li>
            ) : (
              holidays.slice(0, 5).map((h) => (
                <li key={h.id} className="flex items-center justify-between py-2.5">
                  <span className="font-medium text-slate-800">{h.name}</span>
                  <span className="text-xs text-mute">{h.date}</span>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </>
  );
}
