"use client";
import { useState } from "react";
import { BadgeCheck, Pencil, Play } from "lucide-react";
import { Avatar, Badge, Btn, Card, Notice, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui";
import { Field, Modal, Tabs, inputCls, useToast } from "@/components/interactive";
import { SALARIES, WORKING_DAYS, calcPay, type Salary } from "@/lib/mock";
import { fmtINR } from "@/lib/dates";

type Stage = "Draft" | "Finalised" | "Paid";

export default function PayrollPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"run" | "structure">("run");
  const [stage, setStage] = useState<Stage>("Draft");
  const [list, setList] = useState<Salary[]>(SALARIES);
  const [edit, setEdit] = useState<Salary | null>(null);

  const calc = list.map((s) => ({ s, ...calcPay(s) }));
  const sum = (k: "gross" | "deductions" | "net") => calc.reduce((a, r) => a + r[k], 0);
  const num = (k: keyof Salary) => (e: React.ChangeEvent<HTMLInputElement>) => edit && setEdit({ ...edit, [k]: Number(e.target.value) });

  return (
    <>
      <PageHeader title="Payroll" desc="Salary is calculated from each structure, attendance and unpaid leave."
        actions={stage === "Draft" ? <Btn icon={Play} onClick={() => { setStage("Finalised"); toast("Payroll generated for November 2026"); }}>Run payroll</Btn>
          : stage === "Finalised" ? <Btn variant="success" icon={BadgeCheck} onClick={() => { setStage("Paid"); toast("Marked as paid. Employees can see their payslips."); }}>Mark all as paid</Btn>
          : <Badge tone="green" dot>Paid on 17 Nov 2026</Badge>} />
      <Tabs tabs={[{ id: "run", label: "November 2026" }, { id: "structure", label: "Salary structures" }]} value={tab} onChange={setTab} />

      {tab === "run" ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-4">
            {[["Gross pay", fmtINR(sum("gross"))], ["Deductions", fmtINR(sum("deductions"))], ["Net payable", fmtINR(sum("net"))], ["Employees", String(list.length)]].map(([l, v]) => (
              <Card key={l} className="p-4"><p className="text-sm text-slate-500">{l}</p><p className="mt-1 text-2xl font-semibold text-slate-900">{v}</p></Card>
            ))}
          </div>
          <div className="mb-4 flex items-center gap-3"><span className="text-sm text-slate-500">Status</span><StatusBadge s={stage} /></div>
          <Card>
            <Table>
              <thead><tr><Th>Employee</Th><Th>Gross</Th><Th>Unpaid leave</Th><Th>Deductions</Th><Th>Net salary</Th><Th>Status</Th></tr></thead>
              <tbody>
                {calc.map(({ s, gross, unpaidDed, deductions, net }) => (
                  <tr key={s.id}>
                    <Td><div className="flex items-center gap-3"><Avatar name={s.name} /><div><p className="font-medium text-slate-900">{s.name}</p><p className="text-xs text-slate-500">{s.dept}</p></div></div></Td>
                    <Td>{fmtINR(gross)}</Td>
                    <Td>{s.unpaid ? <span className="text-rose-600">{s.unpaid} day{s.unpaid > 1 ? "s" : ""} ({fmtINR(unpaidDed)})</span> : "-"}</Td>
                    <Td>{fmtINR(deductions)}</Td><Td className="font-semibold text-slate-900">{fmtINR(net)}</Td>
                    <Td><StatusBadge s={stage} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
          <p className="mt-3 text-xs text-slate-500">Unpaid leave deduction = gross salary / {WORKING_DAYS} working days x unpaid days. Tax and PF calculations are not included in this release.</p>
        </>
      ) : (
        <Card>
          <Table>
            <thead><tr><Th>Employee</Th><Th>Basic</Th><Th>HRA</Th><Th>Other allowances</Th><Th>Fixed deductions</Th><Th>Gross</Th><Th /></tr></thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <Td><div className="flex items-center gap-3"><Avatar name={s.name} /><span className="font-medium text-slate-900">{s.name}</span></div></Td>
                  <Td>{fmtINR(s.basic)}</Td><Td>{fmtINR(s.hra)}</Td><Td>{fmtINR(s.other)}</Td><Td>{fmtINR(s.fixed)}</Td><Td className="font-medium">{fmtINR(s.basic + s.hra + s.other)}</Td>
                  <Td className="text-right"><Btn size="sm" variant="ghost" icon={Pencil} onClick={() => setEdit(s)}>Edit</Btn></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit salary structure" desc={edit?.name}
        footer={<><Btn variant="outline" onClick={() => setEdit(null)}>Cancel</Btn><Btn onClick={() => { if (edit) setList(list.map((x) => (x.id === edit.id ? edit : x))); toast("Salary structure saved"); setEdit(null); }}>Save</Btn></>}>
        {edit && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Basic (monthly)"><input type="number" className={inputCls} value={edit.basic} onChange={num("basic")} /></Field>
              <Field label="HRA"><input type="number" className={inputCls} value={edit.hra} onChange={num("hra")} /></Field>
              <Field label="Other allowances"><input type="number" className={inputCls} value={edit.other} onChange={num("other")} /></Field>
              <Field label="Fixed deductions"><input type="number" className={inputCls} value={edit.fixed} onChange={num("fixed")} /></Field>
            </div>
            <Notice tone="blue">Changes apply from the next payroll run. Paid months are never changed.</Notice>
          </div>
        )}
      </Modal>
    </>
  );
}
