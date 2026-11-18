"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader, Card, Badge } from "@/components/ui";
import { usePersisted } from "@/lib/store";
import { ME, empName, isStaffName } from "@/lib/comms";
import { employees } from "@/lib/data";
import { DAYS_SHORT, MONTHS, TODAY, fmtShort, iso, parseISO } from "@/lib/dates";
import { HOL_KEY, HOL_SEED, POLICY_KEY, POLICY_SEED, dateOf, fmtN, isWeekend, newId, type Holiday } from "@/lib/calendar";
import { Approvals, useLeaveData } from "@/components/leave";
import { Drawer } from "@/components/drawer";

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayLabel = (s: string) => `${DAYS_SHORT[parseISO(s).getDay()]} ${fmtShort(s)}`;

function useHolidays() {
  const [holidays, update] = usePersisted<Holiday[]>(HOL_KEY, HOL_SEED);
  const upcoming = [...holidays].filter((h) => h.date >= iso(TODAY)).sort((a, b) => a.date.localeCompare(b.date));
  return { holidays, upcoming, update };
}

/* Short list used on the home / dashboard pages */
export function UpcomingHolidays() {
  const { upcoming } = useHolidays();
  return (
    <ul className="divide-y divide-line text-sm">
      {upcoming.slice(0, 4).map((h) => <li key={h.id} className="flex justify-between py-2.5"><span>{h.name}</span><span className="text-mute">{dayLabel(h.date)}</span></li>)}
      {upcoming.length === 0 && <li className="py-2.5 text-mute">No upcoming holidays.</li>}
    </ul>
  );
}

export function CalendarPage({ role }: { role: "employee" | "hr" | "admin" }) {
  const staff = role !== "employee";
  const { holidays, upcoming, update } = useHolidays();
  const { leaves } = useLeaveData();
  const [policy, setPolicy] = usePersisted(POLICY_KEY, POLICY_SEED);

  const [view, setView] = useState({ y: TODAY.getFullYear(), m: TODAY.getMonth() });
  const [sel, setSel] = useState(iso(TODAY));
  const [who, setWho] = useState("all");
  const [hDate, setHDate] = useState(iso(TODAY));
  const [hName, setHName] = useState("");
  const [cas, setCas] = useState<string | null>(null);
  const [sick, setSick] = useState<string | null>(null);
  const [flash, setFlash] = useState("");
  const [drawer, setDrawer] = useState<null | "holiday" | "policy">(null);
  const [err, setErr] = useState("");
  const say = (m: string) => { setFlash(m); setTimeout(() => setFlash(""), 2800); };
  const openDrawer = (d: "holiday" | "policy") => { setErr(""); if (d === "holiday") { setHDate(sel); setHName(""); } setDrawer(d); };
  const closeDrawer = () => setDrawer(null);
  const jump = (d: string) => { const x = parseISO(d); setView({ y: x.getFullYear(), m: x.getMonth() }); pick(d); };

  const people = employees.filter((e) => e.status === "Active" && !isStaffName(e.name));
  // Employees only ever see their own leave. HR and Admin see everyone's (or one person's).
  const shown = leaves.filter((l) => l.status !== "Rejected" && (staff ? who === "all" || l.emp === who : l.emp === ME.employee));
  const holOn = (d: string) => holidays.find((h) => h.date === d);
  const leavesOn = (d: string) => shown.filter((l) => l.from <= d && d <= l.to);

  const first = new Date(view.y, view.m, 1);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(view.y, view.m + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, i) => (i >= offset && i < offset + count ? dateOf(view.y, view.m, i - offset + 1) : null));
  const step = (n: number) => setView((v) => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  const pick = (d: string) => { setSel(d); setHDate(d); };
  const addHoliday = () => {
    const name = hName.trim();
    if (!hDate || !name) return setErr("Add a date and a name.");
    if (holOn(hDate)) return setErr("That date already has a holiday.");
    update((all) => [...all, { id: newId("h"), date: hDate, name }]);
    jump(hDate); closeDrawer(); say("Holiday added for everyone.");
  };
  const savePolicy = () => {
    const c = Number(cas ?? policy.casual), s = Number(sick ?? policy.sick);
    if (![c, s].every((n) => Number.isFinite(n) && n >= 0 && n <= 5)) return setErr("Enter 0 to 5 days.");
    setPolicy(() => ({ casual: c, sick: s })); setCas(null); setSick(null); closeDrawer(); say("Saved. Balances updated for everyone.");
  };

  const selHol = holOn(sel), selLeaves = leavesOn(sel);

  return (
    <>
      <PageHeader title="Calendar" sub={role === "hr" ? "Holidays, everyone’s leave and requests waiting for you." : staff ? "Holidays and everyone’s leave in one place." : "Company holidays and your leave."}>
        {staff && <>
          <select className="field w-40" aria-label="Employee" value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="all">All employees</option>{people.map((e) => <option key={e.code} value={e.code}>{e.name}</option>)}
          </select>
          <button className="btn-ghost whitespace-nowrap" onClick={() => openDrawer("policy")}>Leave per month</button>
          <button className="btn whitespace-nowrap" onClick={() => openDrawer("holiday")}>Add holiday</button>
        </>}
      </PageHeader>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <Card flush>
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="text-[15px] font-semibold">{MONTHS[view.m]} {view.y}</h2>
            <div className="flex items-center gap-1.5">
              <button className="btn-ghost btn-sm" onClick={() => setView({ y: TODAY.getFullYear(), m: TODAY.getMonth() })}>Today</button>
              <button className="btn-ghost btn-sm" aria-label="Previous month" onClick={() => step(-1)}><ChevronLeft className="h-4 w-4" /></button>
              <button className="btn-ghost btn-sm" aria-label="Next month" onClick={() => step(1)}><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-line bg-canvas text-center text-xs font-medium text-mute">
            {WEEK.map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="min-h-[84px] border-b border-r border-line bg-canvas/50" />;
              const hol = holOn(d), ls = leavesOn(d), n = Number(d.slice(8));
              return (
                <button key={d} onClick={() => pick(d)} aria-label={dayLabel(d)} aria-pressed={d === sel}
                  className={`min-h-[84px] min-w-0 border-b border-r border-line p-1.5 text-left align-top ${isWeekend(d) ? "bg-canvas/70" : "bg-white"} ${d === sel ? "outline outline-2 -outline-offset-2 outline-pine" : "hover:bg-canvas"}`}>
                  <span className={`num grid h-6 w-6 place-items-center rounded-full text-xs ${d === iso(TODAY) ? "bg-pine font-semibold text-white" : "text-mute"}`}>{n}</span>
                  <span className="mt-1 block space-y-0.5">
                    {hol && <span className="block truncate rounded bg-pine-soft px-1.5 py-0.5 text-[11px] font-medium text-pine">{hol.name}</span>}
                    {ls.slice(0, hol ? 1 : 2).map((l) => (
                      <span key={l.id} className={`block truncate rounded px-1.5 py-0.5 text-[11px] ${l.status === "Pending" ? "border border-dashed border-amber-400 bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800"}`}>
                        {staff ? `${empName(l.emp).split(" ")[0]} · ${l.type[0]}${l.half ? "½" : ""}` : `${l.type}${l.half ? " ½" : ""}`}
                      </span>
                    ))}
                    {ls.length > (hol ? 1 : 2) && <span className="block px-1 text-[11px] text-mute">+{ls.length - (hol ? 1 : 2)} more</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line px-5 py-3 text-xs text-mute">
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-pine-soft ring-1 ring-pine/40" />Holiday</li>
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-sky-100" />Approved leave</li>
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded border border-dashed border-amber-400 bg-amber-50" />Waiting for approval</li>
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-canvas ring-1 ring-line" />Weekend</li>
            {staff && <li>C casual · S sick · P paid</li>}
          </ul>
        </Card>

        <div className="space-y-6">
          {role === "hr" && <Approvals onPick={jump} />}
          <Card title={dayLabel(sel)}>
            {isWeekend(sel) && !selHol && selLeaves.length === 0 ? <p className="text-sm text-mute">Weekend.</p>
              : !selHol && selLeaves.length === 0 ? <p className="text-sm text-mute">Nothing on this day.</p> : (
              <ul className="divide-y divide-line text-sm">
                {selHol && <li className="flex items-center justify-between py-2.5"><span><b className="font-medium">{selHol.name}</b><span className="block text-xs text-mute">Company holiday</span></span>
                  {staff && <button className="btn-danger btn-sm" onClick={() => update((a) => a.filter((h) => h.id !== selHol.id))}>Remove</button>}</li>}
                {selLeaves.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span>{staff && <b className="font-medium">{empName(l.emp)}</b>}{staff && " · "}{l.type} leave{l.half ? " (half day)" : ""}</span>
                    <Badge>{l.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {!staff && <Card title="Upcoming holidays">
            <ul className="divide-y divide-line text-sm">
              {upcoming.slice(0, 6).map((h) => <li key={h.id}><button className="flex w-full justify-between py-2.5 text-left" onClick={() => { pick(h.date); const d = parseISO(h.date); setView({ y: d.getFullYear(), m: d.getMonth() }); }}><span>{h.name}</span><span className="text-mute">{dayLabel(h.date)}</span></button></li>)}
              {upcoming.length === 0 && <li className="py-2.5 text-mute">No upcoming holidays.</li>}
            </ul>
          </Card>}
        </div>
      </div>

      {staff && <>
      <Drawer open={drawer === "holiday"} onClose={closeDrawer} title="Add a holiday">
        <p className="text-sm text-mute">Shows on every employee’s calendar straight away.</p>
        <div><label className="label" htmlFor="hd">Date</label><input id="hd" type="date" className="field" value={hDate} onChange={(e) => setHDate(e.target.value)} /></div>
        <div><label className="label" htmlFor="hn">Name</label><input id="hn" className="field" placeholder="e.g. Diwali" value={hName} onChange={(e) => setHName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addHoliday()} /></div>
        {err && drawer === "holiday" && <p role="alert" className="text-sm text-rose-700">{err}</p>}
        <button className="btn w-full" onClick={addHoliday}>Add holiday</button>
      </Drawer>

      <Drawer open={drawer === "policy"} onClose={closeDrawer} title="Leave added each month">
        <p className="text-sm text-mute">Days credited to every employee each month.</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="cas">Casual</label><input id="cas" type="number" min={0} max={5} step={0.5} className="field" value={cas ?? policy.casual} onChange={(e) => setCas(e.target.value)} /></div>
          <div><label className="label" htmlFor="sick">Sick</label><input id="sick" type="number" min={0} max={5} step={0.5} className="field" value={sick ?? policy.sick} onChange={(e) => setSick(e.target.value)} /></div>
        </div>
        <p className="text-xs text-mute">Currently {fmtN(policy.casual * 12)} casual and {fmtN(policy.sick * 12)} sick a year.</p>
        {err && drawer === "policy" && <p role="alert" className="text-sm text-rose-700">{err}</p>}
        <button className="btn w-full" onClick={savePolicy}>Save</button>
      </Drawer>
      </>}

      {flash && <div role="status" className="fixed bottom-4 right-4 z-[60] rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{flash}</div>}
    </>
  );
}
