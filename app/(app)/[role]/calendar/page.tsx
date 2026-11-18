"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Btn, Card, CardHeader, PageHeader } from "@/components/ui";
import { CAL_META, HOLIDAYS, MY_EVENTS, type CalType } from "@/lib/mock";
import { DAYS_SHORT, MONTHS, TODAY, fmtShort, iso, pad } from "@/lib/dates";
import { cn } from "@/lib/cn";

const ALL: CalType[] = ["holiday", "leave", "sick", "wfh", "pending"];

export default function CalendarPage() {
  const [ym, setYm] = useState({ y: 2026, m: 10 });
  const [on, setOn] = useState<Record<CalType, boolean>>({ holiday: true, leave: true, sick: true, wfh: true, pending: true });

  const events = [
    ...HOLIDAYS.map((h) => ({ date: h.date, type: "holiday" as CalType, label: h.name })),
    ...MY_EVENTS,
  ].filter((e) => on[e.type]);

  const first = new Date(ym.y, ym.m, 1);
  const days = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const go = (d: number) => { const n = new Date(ym.y, ym.m + d, 1); setYm({ y: n.getFullYear(), m: n.getMonth() }); };
  const monthKey = `${ym.y}-${pad(ym.m + 1)}`;
  const monthEvents = events.filter((e) => e.date.startsWith(monthKey)).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <PageHeader title="Calendar" desc="Leaves, sick days, WFH and holidays in one view." />
      <div className="mb-4 flex flex-wrap gap-2">
        {ALL.map((t) => (
          <button key={t} onClick={() => setOn({ ...on, [t]: !on[t] })}
            className={cn("flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition", on[t] ? "border-slate-300 bg-white text-slate-800" : "border-slate-200 bg-slate-100 text-slate-400")}>
            <i className={cn("h-2.5 w-2.5 rounded-full", on[t] ? CAL_META[t].dot : "bg-slate-300")} />{CAL_META[t].label}
          </button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-base font-semibold text-slate-900">{MONTHS[ym.m]} {ym.y}</h2>
            <div className="flex gap-1"><Btn variant="outline" size="sm" aria-label="Previous month" onClick={() => go(-1)}><ChevronLeft className="h-4 w-4" /></Btn><Btn variant="outline" size="sm" onClick={() => setYm({ y: 2026, m: 10 })}>Today</Btn><Btn variant="outline" size="sm" aria-label="Next month" onClick={() => go(1)}><ChevronRight className="h-4 w-4" /></Btn></div>
          </div>
          <div className="grid grid-cols-7 border-b border-slate-100 text-center text-xs font-medium text-slate-500">
            {DAYS_SHORT.map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              const key = d ? `${monthKey}-${pad(d)}` : "";
              const ev = d ? events.filter((e) => e.date === key) : [];
              const weekend = i % 7 === 0 || i % 7 === 6;
              const today = key === iso(TODAY);
              return (
                <div key={i} className={cn("min-h-20 border-b border-r border-slate-100 p-1.5 sm:min-h-24", !d && "bg-slate-50/50", weekend && !!d && "bg-slate-50")}>
                  {d && <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs", today ? "bg-indigo-600 font-semibold text-white" : "text-slate-600")}>{d}</span>}
                  <div className="mt-1 space-y-1">
                    {ev.map((e, k) => <div key={k} className={cn("truncate rounded px-1.5 py-0.5 text-[11px] font-medium", CAL_META[e.type].chip)} title={e.label}>{e.label}</div>)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="h-fit">
          <CardHeader title={`${MONTHS[ym.m]} schedule`} />
          {monthEvents.length === 0 ? <p className="p-5 text-sm text-slate-500">Nothing scheduled this month.</p> : (
            <ul className="divide-y divide-slate-100">
              {monthEvents.map((e, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3 text-sm"><i className={cn("h-2.5 w-2.5 rounded-full", CAL_META[e.type].dot)} /><span className="flex-1 text-slate-800">{e.label}</span><span className="text-slate-500">{fmtShort(e.date)}</span></li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
