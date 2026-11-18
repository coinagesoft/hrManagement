"use client";
import { useState } from "react";
import { Check, Plane, Plus, X } from "lucide-react";
import { Avatar, Badge, Btn, Card, CardHeader, Empty, Notice, PageHeader, Progress, StatusBadge, Table, Td, Th } from "@/components/ui";
import { Field, Modal, Tabs, inputCls, useToast } from "@/components/interactive";
import { BALANCES, LEAVE_TYPES, MY_LEAVES, TEAM_LEAVES, type LeaveReq } from "@/lib/mock";
import { useRole } from "@/lib/role";
import { daysBetween, fmtShort } from "@/lib/dates";

const range = (l: LeaveReq) => (l.from === l.to ? fmtShort(l.from) : `${fmtShort(l.from)} to ${fmtShort(l.to)}`);

function Mine() {
  const toast = useToast();
  const [list, setList] = useState<LeaveReq[]>(MY_LEAVES);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ type: "Casual", from: "", to: "", half: false, reason: "" });
  const days = f.from && f.to && f.to >= f.from ? (f.half ? 0.5 : daysBetween(f.from, f.to)) : 0;
  const bal = BALANCES.find((b) => b.type === f.type);
  const left = bal ? bal.allocated - bal.used - bal.pending : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setList([{ id: `n${Date.now()}`, who: "Rohan Patil", type: f.type, from: f.from, to: f.to, days, reason: f.reason, status: "Pending" }, ...list]);
    toast("Leave request sent to HR");
    setOpen(false); setF({ type: "Casual", from: "", to: "", half: false, reason: "" });
  }

  return (
    <>
      <PageHeader title="Leave" desc="Your balance, requests and history." actions={<Btn icon={Plus} onClick={() => setOpen(true)}>Apply for leave</Btn>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {BALANCES.map((b) => {
          const rem = b.allocated - b.used - b.pending;
          return (
            <Card key={b.type} className="p-5">
              <div className="flex items-baseline justify-between"><p className="text-sm font-medium text-slate-600">{b.type} leave</p><Badge tone="green">Paid</Badge></div>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{rem}<span className="text-base font-normal text-slate-500"> / {b.allocated} days</span></p>
              <div className="mt-3"><Progress value={((b.used + b.pending) / b.allocated) * 100} /></div>
              <p className="mt-2 text-xs text-slate-500">{b.used} used{b.pending ? `, ${b.pending} pending` : ""}</p>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardHeader title="My requests" />
        <Table>
          <thead><tr><Th>Type</Th><Th>Dates</Th><Th>Days</Th><Th>Reason</Th><Th>Status</Th><Th /></tr></thead>
          <tbody>
            {list.map((l) => (
              <tr key={l.id}>
                <Td className="font-medium text-slate-900">{l.type}</Td><Td>{range(l)}</Td><Td>{l.days}</Td><Td>{l.reason}</Td><Td><StatusBadge s={l.status} /></Td>
                <Td className="text-right">{l.status === "Pending" && <Btn size="sm" variant="ghost" onClick={() => { setList(list.map((x) => (x.id === l.id ? { ...x, status: "Cancelled" } : x))); toast("Request cancelled"); }}>Cancel</Btn>}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Apply for leave"
        footer={<><Btn variant="outline" onClick={() => setOpen(false)}>Cancel</Btn><Btn type="submit" form="apply" disabled={days <= 0 || (left !== null && days > left)}>Submit request</Btn></>}>
        <form id="apply" onSubmit={submit} className="space-y-4">
          <Field label="Leave type"><select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="From"><input required type="date" className={inputCls} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value, to: f.to < e.target.value ? e.target.value : f.to })} /></Field>
            <Field label="To"><input required type="date" min={f.from} className={inputCls} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={f.half} onChange={(e) => setF({ ...f, half: e.target.checked })} /> Half day</label>
          <Field label="Reason"><input required className={inputCls} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
          {days > 0 && left !== null && (
            <Notice tone={days > left ? "rose" : "blue"}>{days > left ? `You only have ${left} days of ${f.type} leave left.` : `${days} day${days > 1 ? "s" : ""} will be deducted. Balance after approval: ${left - days} days.`}</Notice>
          )}
        </form>
      </Modal>
    </>
  );
}

function Team() {
  const toast = useToast();
  const [list, setList] = useState<LeaveReq[]>(TEAM_LEAVES);
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [rej, setRej] = useState<LeaveReq | null>(null);
  const pending = list.filter((l) => l.status === "Pending");
  const history = list.filter((l) => l.status !== "Pending");
  const decide = (l: LeaveReq, s: "Approved" | "Rejected") => { setList(list.map((x) => (x.id === l.id ? { ...x, status: s } : x))); toast(`Leave ${s.toLowerCase()} for ${l.who}`); setRej(null); };

  return (
    <>
      <PageHeader title="Leave requests" desc="Approve or reject. Balances update automatically." />
      <Tabs tabs={[{ id: "pending", label: "Pending", count: pending.length }, { id: "history", label: "History", count: history.length }]} value={tab} onChange={setTab} />
      <Card>
        {(tab === "pending" ? pending : history).length === 0 ? <Empty icon={Plane} title="All caught up" desc="No leave requests waiting for approval." /> : (
          <Table>
            <thead><tr><Th>Employee</Th><Th>Type</Th><Th>Dates</Th><Th>Days</Th><Th>Reason</Th><Th>{tab === "pending" ? "Action" : "Status"}</Th></tr></thead>
            <tbody>
              {(tab === "pending" ? pending : history).map((l) => (
                <tr key={l.id}>
                  <Td><div className="flex items-center gap-3"><Avatar name={l.who} /><span className="font-medium text-slate-900">{l.who}</span></div></Td>
                  <Td>{l.type}</Td><Td>{range(l)}</Td><Td>{l.days}</Td><Td>{l.reason}</Td>
                  <Td>{tab === "pending" ? (
                    <div className="flex gap-2"><Btn size="sm" variant="outline" icon={X} onClick={() => setRej(l)}>Reject</Btn><Btn size="sm" variant="success" icon={Check} onClick={() => decide(l, "Approved")}>Approve</Btn></div>
                  ) : <StatusBadge s={l.status} />}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Modal open={!!rej} onClose={() => setRej(null)} title="Reject leave request" desc={rej ? `${rej.who}, ${rej.type}, ${range(rej)}` : undefined}
        footer={<><Btn variant="outline" onClick={() => setRej(null)}>Cancel</Btn><Btn variant="danger" onClick={() => rej && decide(rej, "Rejected")}>Reject</Btn></>}>
        <Field label="Note to employee (optional)"><input className={inputCls} placeholder="e.g. Project deadline that week" /></Field>
      </Modal>
    </>
  );
}

export default function LeavePage() {
  return useRole() === "employee" ? <Mine /> : <Team />;
}
