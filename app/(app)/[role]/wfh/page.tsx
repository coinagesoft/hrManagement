"use client";
import { useState } from "react";
import { Check, House, Plus, X } from "lucide-react";
import { Avatar, Btn, Card, CardHeader, Empty, Notice, PageHeader, Progress, StatusBadge, Table, Td, Th } from "@/components/ui";
import { Field, Modal, Tabs, inputCls, useToast } from "@/components/interactive";
import { MY_WFH, TEAM_WFH, type WfhReq } from "@/lib/mock";
import { useRole } from "@/lib/role";
import { fmtDate } from "@/lib/dates";

function Mine() {
  const toast = useToast();
  const [list, setList] = useState<WfhReq[]>(MY_WFH);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ date: "", reason: "" });
  const used = list.filter((w) => w.status === "Approved").length;
  return (
    <>
      <PageHeader title="Work from home" desc="WFH is allowed only on days HR has approved." actions={<Btn icon={Plus} onClick={() => setOpen(true)}>Request WFH</Btn>} />
      <Card className="mb-6 p-5">
        <div className="flex items-baseline justify-between"><p className="text-sm font-medium text-slate-700">WFH days this month</p><p className="text-sm text-slate-500"><b className="text-slate-900">{used}</b> of 4 used</p></div>
        <div className="mt-3"><Progress value={(used / 4) * 100} tone="bg-teal-500" /></div>
      </Card>
      <Notice tone="blue" icon={House}>On an approved day you can check in from anywhere. On all other days, check-in works only from the office network.</Notice>
      <Card className="mt-6">
        <CardHeader title="My requests" />
        <Table>
          <thead><tr><Th>Date</Th><Th>Reason</Th><Th>Status</Th><Th /></tr></thead>
          <tbody>
            {list.map((w) => (
              <tr key={w.id}><Td className="font-medium text-slate-900">{fmtDate(w.date)}</Td><Td>{w.reason}</Td><Td><StatusBadge s={w.status} /></Td>
                <Td className="text-right">{w.status === "Pending" && <Btn size="sm" variant="ghost" onClick={() => { setList(list.map((x) => (x.id === w.id ? { ...x, status: "Cancelled" } : x))); toast("Request cancelled"); }}>Cancel</Btn>}</Td></tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Request work from home"
        footer={<><Btn variant="outline" onClick={() => setOpen(false)}>Cancel</Btn><Btn type="submit" form="wfh">Send to HR</Btn></>}>
        <form id="wfh" className="space-y-4" onSubmit={(e) => { e.preventDefault(); setList([{ id: `n${Date.now()}`, who: "Rohan Patil", date: f.date, reason: f.reason, status: "Pending" }, ...list]); toast("WFH request sent to HR"); setOpen(false); setF({ date: "", reason: "" }); }}>
          <Field label="Date"><input required type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Reason"><input required className={inputCls} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
        </form>
      </Modal>
    </>
  );
}

function Team() {
  const toast = useToast();
  const [list, setList] = useState<WfhReq[]>(TEAM_WFH);
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const pending = list.filter((w) => w.status === "Pending");
  const history = list.filter((w) => w.status !== "Pending");
  const decide = (w: WfhReq, s: "Approved" | "Rejected") => { setList(list.map((x) => (x.id === w.id ? { ...x, status: s } : x))); toast(`WFH ${s.toLowerCase()} for ${w.who}`); };
  const rows = tab === "pending" ? pending : history;
  return (
    <>
      <PageHeader title="WFH requests" desc="Employees can check in remotely only on days you approve." />
      <Tabs tabs={[{ id: "pending", label: "Pending", count: pending.length }, { id: "history", label: "History", count: history.length }]} value={tab} onChange={setTab} />
      <Card>
        {rows.length === 0 ? <Empty icon={House} title="All caught up" desc="No WFH requests waiting for approval." /> : (
          <Table>
            <thead><tr><Th>Employee</Th><Th>Date</Th><Th>Reason</Th><Th>{tab === "pending" ? "Action" : "Status"}</Th></tr></thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.id}>
                  <Td><div className="flex items-center gap-3"><Avatar name={w.who} /><span className="font-medium text-slate-900">{w.who}</span></div></Td>
                  <Td>{fmtDate(w.date)}</Td><Td>{w.reason}</Td>
                  <Td>{tab === "pending" ? <div className="flex gap-2"><Btn size="sm" variant="outline" icon={X} onClick={() => decide(w, "Rejected")}>Reject</Btn><Btn size="sm" variant="success" icon={Check} onClick={() => decide(w, "Approved")}>Approve</Btn></div> : <StatusBadge s={w.status} />}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

export default function WfhPage() {
  return useRole() === "employee" ? <Mine /> : <Team />;
}
