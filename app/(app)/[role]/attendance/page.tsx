"use client";

import { useEffect, useState } from "react";
import { Clock, Pencil, Search, Loader2 } from "lucide-react";
import { Avatar, Badge, Btn, Card, Empty, PageHeader, StatusBadge, Table, Td, Th, SectionLoader } from "@/components/ui";
import { Field, Modal, inputCls, useToast } from "@/components/interactive";
import { useRole } from "@/lib/role";
import { fmtDate, DAYS_SHORT, parseISO } from "@/lib/dates";

function Mine() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ present: 0, late: 0, halfDays: 0, onLeave: 0 });

  useEffect(() => {
    fetch("/api/employee/attendance?month=November%202026")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) {
          setRows(data.records);
          setSummary(data.summary);
        }
      })
      .catch((err) => console.error("Failed to load attendance:", err))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    ["Present", summary.present, "text-emerald-600"],
    ["Late", summary.late, "text-amber-600"],
    ["On leave", summary.onLeave, "text-indigo-600"],
    ["WFH days", rows.filter((r) => r.mode === "WFH").length, "text-teal-600"],
  ] as const;

  return (
    <>
      <PageHeader title="My attendance" desc="November 2026" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(([l, n, c]) => (
          <Card key={l} className="p-4">
            <p className="text-sm text-slate-500">{l}</p>
            <p className={`mt-1 text-2xl font-semibold ${c}`}>{n}</p>
          </Card>
        ))}
      </div>
      <Card>
        {loading ? (
          <SectionLoader message="Loading attendance history..." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Day</Th>
                <Th>Check in</Th>
                <Th>Check out</Th>
                <Th>Mode</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id || r.date}>
                  <Td className="font-medium text-slate-900">{fmtDate(r.date)}</Td>
                  <Td>{DAYS_SHORT[parseISO(r.date).getDay()]}</Td>
                  <Td>{r.checkIn || r.in || "—"}</Td>
                  <Td>{r.checkOut || r.out || "—"}</Td>
                  <Td>{r.mode === "-" ? "-" : <StatusBadge s={r.mode} />}</Td>
                  <Td>
                    <div className="flex flex-col gap-0.5">
                      <StatusBadge s={r.status} />
                      {r.status === "On leave" && r.leaveReason && (
                        <span className="text-[10px] text-slate-500 truncate max-w-[140px]" title={r.leaveReason}>
                          {r.leaveReason}
                        </span>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

interface TeamRow {
  userId: number;
  code: string;
  name: string;
  dept: string;
  title: string;
  status: string;
  mode: string;
  in: string;
  out: string;
  ip: string;
  leaveReason?: string | null;
  leaveType?: string | null;
}

function Team() {
  const toast = useToast();
  const [date, setDate] = useState("2026-11-18");
  const [list, setList] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [st, setSt] = useState("All");
  const [fix, setFix] = useState<TeamRow | null>(null);
  const [correctForm, setCorrectForm] = useState({ checkIn: "09:30", checkOut: "18:30", reason: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDate(new Date().toISOString().split("T")[0]);
  }, []);

  const fetchAttendance = async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/attendance?date=${d}`);
      const data = await res.json();
      if (data?.success && data?.roster) {
        setList(data.roster);
      }
    } catch (err) {
      console.error("Failed to load attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance(date);
  }, [date]);

  const shown = list.filter(
    (r) =>
      r.name.toLowerCase().includes(q.toLowerCase()) &&
      (st === "All" || r.status === st)
  );

  const c = (statusName: string) => list.filter((r) => r.status === statusName).length;
  const wfhCount = list.filter((r) => r.mode === "WFH").length;

  const handleCorrect = async () => {
    if (!fix) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: fix.userId,
          date,
          checkIn: correctForm.checkIn,
          checkOut: correctForm.checkOut,
          notes: correctForm.reason,
          status: "Present",
          mode: fix.mode === "-" ? "Office" : fix.mode,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Failed to save correction");

      toast("Attendance corrected and logged in audit trail");
      setFix(null);
      fetchAttendance(date);
    } catch (err: any) {
      toast(err.message || "Failed to update attendance");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Attendance Roster"
        desc={`Team attendance roster for ${date}`}
        actions={
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${inputCls} !w-auto cursor-pointer`}
          />
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge tone="green" dot>Present {c("Present")}</Badge>
        <Badge tone="amber" dot>Late {c("Late")}</Badge>
        <Badge tone="indigo" dot>On leave {c("On leave")}</Badge>
        <Badge tone="teal" dot>WFH {wfhCount}</Badge>
        <Badge tone="slate" dot>Absent {c("Absent")}</Badge>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-60 flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Search employee by name"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select className={`${inputCls} !w-auto`} value={st} onChange={(e) => setSt(e.target.value)}>
            <option>All</option>
            <option>Present</option>
            <option>Late</option>
            <option>On leave</option>
            <option>Absent</option>
          </select>
        </div>

        {loading ? (
          <SectionLoader message="Loading attendance records..." />
        ) : shown.length === 0 ? (
          <Empty icon={Clock} title="No records found" desc="No attendance marked for this date or matching filter." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Employee</Th>
                <Th>Check in</Th>
                <Th>Check out</Th>
                <Th>Mode</Th>
                <Th>Network IP</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.userId}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={r.name} />
                      <div>
                        <p className="font-medium text-slate-900">{r.name}</p>
                        <p className="text-xs text-slate-500">{r.dept} · {r.code}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="font-mono text-xs">{r.in}</Td>
                  <Td className="font-mono text-xs">{r.out}</Td>
                  <Td>{r.mode === "-" ? "-" : <StatusBadge s={r.mode} />}</Td>
                  <Td className="font-mono text-xs">{r.ip}</Td>
                  <Td>
                    <div className="flex flex-col gap-0.5">
                      <StatusBadge s={r.status} />
                      {r.status === "On leave" && r.leaveReason && (
                        <span className="text-[10px] text-slate-500 truncate max-w-[140px]" title={r.leaveReason}>
                          {r.leaveReason}
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td className="text-right">
                    <Btn
                      size="sm"
                      variant="ghost"
                      icon={Pencil}
                      onClick={() => {
                        setFix(r);
                        setCorrectForm({
                          checkIn: r.in === "-" ? "09:30" : r.in,
                          checkOut: r.out === "-" ? "18:30" : r.out,
                          reason: "",
                        });
                      }}
                    >
                      Correct
                    </Btn>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Correct attendance modal */}
      <Modal
        open={!!fix}
        onClose={() => setFix(null)}
        title="Correct attendance"
        desc={fix ? `${fix.name} · ${date}` : undefined}
        footer={
          <>
            <Btn variant="outline" onClick={() => setFix(null)}>
              Cancel
            </Btn>
            <Btn onClick={handleCorrect} disabled={saving}>
              {saving ? "Saving..." : "Save correction"}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Check in">
              <input
                type="time"
                className={inputCls}
                value={correctForm.checkIn}
                onChange={(e) => setCorrectForm({ ...correctForm, checkIn: e.target.value })}
              />
            </Field>
            <Field label="Check out">
              <input
                type="time"
                className={inputCls}
                value={correctForm.checkOut}
                onChange={(e) => setCorrectForm({ ...correctForm, checkOut: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Reason" hint="Corrections are recorded in the permanent audit trail.">
            <input
              className={inputCls}
              placeholder="e.g. Card scanner glitch, forgot to punch out"
              value={correctForm.reason}
              onChange={(e) => setCorrectForm({ ...correctForm, reason: e.target.value })}
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}

export default function AttendancePage() {
  const role = useRole();
  return role === "employee" ? <Mine /> : <Team />;
}
