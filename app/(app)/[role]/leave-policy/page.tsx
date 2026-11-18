"use client";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Btn, Card, CardHeader, PageHeader } from "@/components/ui";
import { Field, Modal, Toggle, inputCls, useToast } from "@/components/interactive";

type LT = { id: string; name: string; quota: number; paid: boolean; carry: boolean; note: string };
const INIT: LT[] = [
  { id: "t1", name: "Casual Leave", quota: 12, paid: true, carry: false, note: "For personal work. Apply at least 1 day ahead." },
  { id: "t2", name: "Sick Leave", quota: 8, paid: true, carry: false, note: "Medical certificate needed after 2 days." },
  { id: "t3", name: "Earned Leave", quota: 15, paid: true, carry: true, note: "Accrues yearly. Unused days carry forward." },
  { id: "t4", name: "Unpaid Leave", quota: 30, paid: false, carry: false, note: "Deducted from salary in payroll." },
];

export default function LeavePolicyPage() {
  const toast = useToast();
  const [list, setList] = useState(INIT);
  const [edit, setEdit] = useState<LT | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [rules, setRules] = useState({ half: true, negative: false, sandwich: false });

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setList(isNew ? [...list, edit] : list.map((x) => (x.id === edit.id ? edit : x)));
    toast(isNew ? "Leave type created" : "Leave type updated");
    setEdit(null);
  }

  return (
    <>
      <PageHeader title="Leave policy" desc="Define leave types and yearly quotas. Balances are created for every employee automatically."
        actions={<Btn icon={Plus} onClick={() => { setIsNew(true); setEdit({ id: `t${Date.now()}`, name: "", quota: 10, paid: true, carry: false, note: "" }); }}>Add leave type</Btn>} />
      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((t) => (
          <Card key={t.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{t.name}</h3>
                <div className="mt-2 flex gap-2"><Badge tone={t.paid ? "green" : "slate"}>{t.paid ? "Paid" : "Unpaid"}</Badge>{t.carry && <Badge tone="blue">Carry forward</Badge>}</div>
              </div>
              <p className="text-right"><span className="text-3xl font-semibold text-slate-900">{t.quota}</span><span className="block text-xs text-slate-500">days / year</span></p>
            </div>
            <p className="mt-3 text-sm text-slate-500">{t.note}</p>
            <div className="mt-4 flex gap-2">
              <Btn size="sm" variant="outline" icon={Pencil} onClick={() => { setIsNew(false); setEdit(t); }}>Edit</Btn>
              <Btn size="sm" variant="ghost" icon={Trash2} onClick={() => { setList(list.filter((x) => x.id !== t.id)); toast("Leave type removed"); }}>Remove</Btn>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader title="General rules" />
        <ul className="divide-y divide-slate-100">
          {([
            ["half", "Allow half-day leave", "Employees can apply for half a day."],
            ["negative", "Allow negative balance", "Let employees apply even when the balance is zero (treated as unpaid)."],
            ["sandwich", "Count weekends between leaves", "Weekends and holidays inside a leave period count as leave."],
          ] as const).map(([k, t, d]) => (
            <li key={k} className="flex items-center justify-between gap-4 px-5 py-4">
              <div><p className="text-sm font-medium text-slate-900">{t}</p><p className="text-sm text-slate-500">{d}</p></div>
              <Toggle label={t} checked={rules[k]} onChange={(v) => { setRules({ ...rules, [k]: v }); toast("Policy updated"); }} />
            </li>
          ))}
        </ul>
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={isNew ? "Add leave type" : "Edit leave type"}
        footer={<><Btn variant="outline" onClick={() => setEdit(null)}>Cancel</Btn><Btn type="submit" form="lt">Save</Btn></>}>
        {edit && (
          <form id="lt" onSubmit={save} className="space-y-4">
            <Field label="Name"><input required className={inputCls} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Days per year"><input required type="number" min={0} className={inputCls} value={edit.quota} onChange={(e) => setEdit({ ...edit, quota: Number(e.target.value) })} /></Field>
            <Field label="Description"><input className={inputCls} value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></Field>
            <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-700">Paid leave</span><Toggle label="Paid" checked={edit.paid} onChange={(v) => setEdit({ ...edit, paid: v })} /></div>
            <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-700">Carry forward unused days</span><Toggle label="Carry forward" checked={edit.carry} onChange={(v) => setEdit({ ...edit, carry: v })} /></div>
          </form>
        )}
      </Modal>
    </>
  );
}
