"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Check, X, Loader2, Calendar as CalendarIcon, Plus, Settings } from "lucide-react";
import { Badge, Btn, Card, PageHeader } from "@/components/ui";
import { Modal, Field, inputCls, useToast } from "@/components/interactive";
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
  userId: number;
  name: string;
  code: string;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: string;
}

interface WfhItem {
  id: number;
  userId: number;
  name: string;
  code: string;
  date: string;
  reason: string;
  status: string;
}

interface ApprovalItem {
  id: string;
  rawId: number;
  kind: "Leave" | "WFH";
  who: string;
  code: string;
  dept: string;
  type: string;
  dates: string;
  days?: number;
  reason: string;
}

interface LeavePolicy {
  casual: number;
  sick: number;
  paid: number;
  workingDays: number;
}

export default function CalendarApprovalsPage() {
  const toast = useToast();
  const [ym, setYm] = useState({ y: 2026, m: 10 }); // month is 0-indexed (10 = Nov)
  const [loading, setLoading] = useState(true);

  // Data from backend
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [wfhList, setWfhList] = useState<WfhItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [policy, setPolicy] = useState<LeavePolicy>({ casual: 1.0, sick: 1.0, paid: 12, workingDays: 22 });

  // Filtering
  const [filterType, setFilterType] = useState<"all" | "holiday" | "leave" | "wfh">("all");
  const [filterEmp, setFilterEmp] = useState<string>("all");

  // Selection
  const [selectedDate, setSelectedDate] = useState<string>("2026-11-18");

  // Modals
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ name: "", date: "2026-11-18", kind: "Company" });
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editPolicy, setEditPolicy] = useState<LeavePolicy>({ casual: 1.0, sick: 1.0, paid: 12, workingDays: 22 });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCalendar = async () => {
    try {
      const year = ym.y;
      const month = ym.m + 1;
      const res = await fetch(`/api/hr/calendar?year=${year}&month=${month}`);
      const json = await res.json();
      if (json?.success) {
        setHolidays(json.holidays);
        setLeaves(json.leaves);
        setWfhList(json.wfh);
        setApprovals(json.pendingApprovals);
        setPolicy(json.policy);
        setEditPolicy(json.policy);
      }
    } catch (err) {
      console.error("Failed to fetch calendar data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [ym]);

  const handleDecision = async (item: ApprovalItem, action: "Approved" | "Rejected") => {
    setActionLoading(item.id);
    try {
      const res = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.rawId,
          type: item.kind,
          action,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to process request");

      toast(`${action}: ${item.who}'s request`);
      await fetchCalendar();
    } catch (err: any) {
      toast(err.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddHoliday = async () => {
    if (!newHoliday.name.trim() || !newHoliday.date) {
      toast("Please provide both name and date");
      return;
    }
    try {
      const res = await fetch("/api/admin/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newHoliday),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add holiday");

      toast(`Added holiday: ${newHoliday.name}`);
      setShowHolidayModal(false);
      setNewHoliday({ name: "", date: "2026-11-18", kind: "Company" });
      await fetchCalendar();
    } catch (err: any) {
      toast(err.message || "Failed to add holiday");
    }
  };

  const handleSavePolicy = async () => {
    try {
      const res = await fetch("/api/hr/leave-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editPolicy),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update leave policy");

      toast("Leave policy updated successfully");
      setShowPolicyModal(false);
      setPolicy(editPolicy);
    } catch (err: any) {
      toast(err.message || "Failed to save policy");
    }
  };

  // Build calendar matrix
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

  // Events on a given date string (YYYY-MM-DD)
  const getEventsForDate = (dateStr: string) => {
    const h = holidays.filter((h) => h.date === dateStr);
    const l = leaves.filter((l) => l.from <= dateStr && dateStr <= l.to && (filterEmp === "all" || l.code === filterEmp));
    const w = wfhList.filter((w) => w.date === dateStr && (filterEmp === "all" || w.code === filterEmp));

    const events: { label: string; type: "holiday" | "leave" | "wfh"; color: string }[] = [];
    if (filterType === "all" || filterType === "holiday") {
      h.forEach((item) => events.push({ label: item.name, type: "holiday", color: "bg-amber-100 text-amber-800 border-amber-200" }));
    }
    if (filterType === "all" || filterType === "leave") {
      l.forEach((item) => events.push({ label: `${item.name} (${item.type})`, type: "leave", color: "bg-rose-100 text-rose-800 border-rose-200" }));
    }
    if (filterType === "all" || filterType === "wfh") {
      w.forEach((item) => events.push({ label: `${item.name} (WFH)`, type: "wfh", color: "bg-sky-100 text-sky-800 border-sky-200" }));
    }
    return events;
  };

  const selEvents = getEventsForDate(selectedDate);
  const selHoliday = holidays.find((h) => h.date === selectedDate);

  // Distinct employees from leaves & wfh
  const employeePairs: [string, string][] = [
    ...leaves.map((l) => [l.code, l.name] as [string, string]),
    ...wfhList.map((w) => [w.code, w.name] as [string, string]),
  ];
  const employeeOptions: [string, string][] = Array.from(new Map(employeePairs).entries());

  return (
    <>
      <PageHeader
        title="Calendar & approvals"
        sub="Company holidays, approved team leaves, and pending approvals waiting for your decision."
        actions={
          <div className="flex items-center gap-2">
            <Btn variant="outline" icon={Settings} onClick={() => setShowPolicyModal(true)}>
              Leave quota
            </Btn>
            <Btn icon={Plus} onClick={() => setShowHolidayModal(true)}>
              Add holiday
            </Btn>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
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
              {t === "all" ? "All events" : t === "holiday" ? "Holidays" : t === "leave" ? "Leaves" : "WFH"}
            </button>
          ))}
        </div>

        {employeeOptions.length > 0 && (
          <select
            className="field max-w-[200px] text-xs"
            value={filterEmp}
            onChange={(e) => setFilterEmp(e.target.value)}
          >
            <option value="all">All employees</option>
            {employeeOptions.map(([code, name]) => (
              <option key={code} value={code}>
                {name} ({code})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        {/* Main Calendar Card */}
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
                    {ev.length > 0 && (
                      <span className="text-[10px] font-semibold text-mute">
                        {ev.length}
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
                    {ev.length > 2 && (
                      <p className="text-[10px] font-medium text-mute">
                        +{ev.length - 2} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Date Details */}
          <div className="border-t border-line bg-canvas p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-mute">
              Events on {selectedDate}
            </h4>
            {selEvents.length === 0 ? (
              <p className="mt-1 text-sm text-mute">No leaves or holidays on this date.</p>
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

        {/* Right Column: Approvals & Holiday Quicklist */}
        <div className="space-y-6">
          <Card
            title="Waiting for decision"
            action={<Badge tone="amber">{approvals.length} pending</Badge>}
          >
            {approvals.length === 0 ? (
              <p className="py-4 text-center text-sm text-mute">All pending requests are clear!</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {approvals.map((req) => (
                  <li key={req.id} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <b className="font-medium text-slate-900">{req.who}</b>
                        <span className="block text-xs text-mute">
                          {req.dept} · {req.kind} ({req.type})
                        </span>
                        <p className="mt-1 text-xs text-slate-700">{req.dates}</p>
                        {req.reason && <p className="mt-0.5 text-xs italic text-mute">"{req.reason}"</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          disabled={actionLoading === req.id}
                          onClick={() => handleDecision(req, "Approved")}
                          aria-label="Approve"
                          className="rounded-md border border-line bg-white p-1 text-pine hover:bg-pine hover:text-white"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          disabled={actionLoading === req.id}
                          onClick={() => handleDecision(req, "Rejected")}
                          aria-label="Reject"
                          className="rounded-md border border-line bg-white p-1 text-rose-600 hover:bg-rose-600 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Upcoming holidays" action={<Btn size="sm" variant="ghost" onClick={() => setShowHolidayModal(true)}>Add</Btn>}>
            <ul className="divide-y divide-line text-sm">
              {holidays.slice(0, 5).map((h) => (
                <li key={h.id} className="flex items-center justify-between py-2.5">
                  <span className="font-medium text-slate-800">{h.name}</span>
                  <span className="text-xs text-mute">{h.date}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Add Holiday Modal */}
      <Modal
        open={showHolidayModal}
        onClose={() => setShowHolidayModal(false)}
        title="Add company holiday"
        desc="Adds a paid holiday visible across everyone's calendar."
        footer={
          <>
            <Btn variant="outline" onClick={() => setShowHolidayModal(false)}>
              Cancel
            </Btn>
            <Btn onClick={handleAddHoliday}>Add holiday</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Holiday name">
            <input
              type="text"
              className={inputCls}
              placeholder="e.g. Diwali, Republic Day"
              value={newHoliday.name}
              onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              className={inputCls}
              value={newHoliday.date}
              onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
            />
          </Field>
          <Field label="Kind">
            <select
              className={inputCls}
              value={newHoliday.kind}
              onChange={(e) => setNewHoliday({ ...newHoliday, kind: e.target.value })}
            >
              <option value="National">National Holiday</option>
              <option value="Company">Company Holiday</option>
              <option value="Optional">Optional / Restricted</option>
            </select>
          </Field>
        </div>
      </Modal>

      {/* Leave Policy Modal */}
      <Modal
        open={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        title="Company leave quota policy"
        desc="Sets the leave accrual rate and working day standards for payroll."
        footer={
          <>
            <Btn variant="outline" onClick={() => setShowPolicyModal(false)}>
              Cancel
            </Btn>
            <Btn onClick={handleSavePolicy}>Save policy</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Casual leave (per month)">
              <input
                type="number"
                step="0.5"
                className={inputCls}
                value={editPolicy.casual}
                onChange={(e) => setEditPolicy({ ...editPolicy, casual: Number(e.target.value) })}
              />
            </Field>
            <Field label="Sick leave (per month)">
              <input
                type="number"
                step="0.5"
                className={inputCls}
                value={editPolicy.sick}
                onChange={(e) => setEditPolicy({ ...editPolicy, sick: Number(e.target.value) })}
              />
            </Field>
            <Field label="Paid leave (per year)">
              <input
                type="number"
                className={inputCls}
                value={editPolicy.paid}
                onChange={(e) => setEditPolicy({ ...editPolicy, paid: Number(e.target.value) })}
              />
            </Field>
            <Field label="Working days / month">
              <input
                type="number"
                className={inputCls}
                value={editPolicy.workingDays}
                onChange={(e) => setEditPolicy({ ...editPolicy, workingDays: Number(e.target.value) })}
              />
            </Field>
          </div>
          <p className="text-xs text-mute">
            Working days per month determines per-day deductions for unpaid leave in payroll calculations.
          </p>
        </div>
      </Modal>
    </>
  );
}
