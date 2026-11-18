"use client";
import { useState } from "react";
import { Clock, Pencil, Search } from "lucide-react";
import { Avatar, Badge, Btn, Card, Empty, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui";
import { Field, Modal, inputCls, useToast } from "@/components/interactive";
import { TEAM_TODAY, myAttendanceNov, type TeamRow } from "@/lib/mock";
import { useRole } from "@/lib/role";
import { fmtDate, DAYS_SHORT, parseISO } from "@/lib/dates";

function Mine() {
  const rows = myAttendanceNov();
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const stats = [["Present", count("Present"), "text-emerald-600"], ["Late", count("Late"), "text-amber-600"], ["On leave", count("On leave"), "text-indigo-600"], ["WFH days", rows.filter((r) => r.mode === "WFH").length, "text-teal-600"]] as const;
  return (
    <>
      <PageHeader title="My attendance" desc="November 2026" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(([l, n, c]) => <Card key={l} className="p-4"><p className="text-sm text-slate-500">{l}</p><p className={`mt-1 text-2xl font-semibold ${c}`}>{n}</p></Card>)}
      </div>
      <Card>
        <Table>
          <thead><tr><Th>Date</Th><Th>Day</Th><Th>Check in</Th><Th>Check out</Th><Th>Hours</Th><Th>Mode</Th><Th>Status</Th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date} className={r.status === "Weekend" ? "bg-slate-50/60" : ""}>
                <Td className="font-medium text-slate-900">{fmtDate(r.date)}</Td><Td>{DAYS_SHORT[parseISO(r.date).getDay()]}</Td>
                <Td>{r.in}</Td><Td>{r.out}</Td><Td>{r.hours}</Td>
                <Td>{r.mode === "-" ? "-" : <StatusBadge s={r.mode} />}</Td>
                <Td><StatusBadge s={r.status} label={r.note ? `${r.status}: ${r.note}` : r.status} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}

function Team() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [st, setSt] = useState("All");
  const [fix, setFix] = useState<TeamRow | null>(null);
  const shown = TEAM_TODAY.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()) && (st === "All" || r.status === st));
  const c = (s: string) => TEAM_TODAY.filter((r) => r.status === s).length;
  return (
    <>
      <PageHeader title="Attendance" desc="Today, Tuesday 17 November 2026"
        actions={<input type="date" defaultValue="2026-11-17" className={`${inputCls} !w-auto`} />} />
      <div className="mb-6 flex flex-wrap gap-2">
        <Badge tone="green" dot>Present {c("Present")}</Badge><Badge tone="amber" dot>Late {c("Late")}</Badge>
        <Badge tone="indigo" dot>On leave {c("On leave")}</Badge><Badge tone="teal" dot>WFH {TEAM_TODAY.filter((r) => r.mode === "WFH").length}</Badge>
      </div>
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-60 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className={`${inputCls} pl-9`} placeholder="Search employee" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className={`${inputCls} !w-auto`} value={st} onChange={(e) => setSt(e.target.value)}><option>All</option><option>Present</option><option>Late</option><option>On leave</option><option>Absent</option></select>
        </div>
        {shown.length === 0 ? <Empty icon={Clock} title="No records" /> : (
          <Table>
            <thead><tr><Th>Employee</Th><Th>Check in</Th><Th>Check out</Th><Th>Mode</Th><Th>Network</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.name}>
                  <Td><div className="flex items-center gap-3"><Avatar name={r.name} /><div><p className="font-medium text-slate-900">{r.name}</p><p className="text-xs text-slate-500">{r.dept}</p></div></div></Td>
                  <Td>{r.in}</Td><Td>{r.out}</Td><Td>{r.mode === "-" ? "-" : <StatusBadge s={r.mode} />}</Td>
                  <Td className="font-mono text-xs">{r.ip}</Td><Td><StatusBadge s={r.status} /></Td>
                  <Td className="text-right"><Btn size="sm" variant="ghost" icon={Pencil} onClick={() => setFix(r)}>Correct</Btn></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Modal open={!!fix} onClose={() => setFix(null)} title="Correct attendance" desc={fix ? `${fix.name}, 17 Nov 2026` : undefined}
        footer={<><Btn variant="outline" onClick={() => setFix(null)}>Cancel</Btn><Btn onClick={() => { toast("Attendance corrected and logged"); setFix(null); }}>Save correction</Btn></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4"><Field label="Check in"><input type="time" className={inputCls} defaultValue="09:30" /></Field><Field label="Check out"><input type="time" className={inputCls} defaultValue="18:30" /></Field></div>
          <Field label="Reason" hint="Corrections are recorded in the audit log."><input className={inputCls} placeholder="e.g. Forgot to check out" /></Field>
        </div>
      </Modal>
    </>
  );
}

export default function AttendancePage() {
  return useRole() === "employee" ? <Mine /> : <Team />;
}
