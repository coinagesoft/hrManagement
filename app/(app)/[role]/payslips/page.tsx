"use client";
import { useState } from "react";
import { Download, Eye } from "lucide-react";
import { Badge, Btn, Card, PageHeader, Table, Td, Th } from "@/components/ui";
import { Modal, useToast } from "@/components/interactive";
import { PAYSLIPS, SALARIES, WORKING_DAYS, calcPay } from "@/lib/mock";
import { fmtDate, fmtINR } from "@/lib/dates";

function Row({ l, r, b }: { l: string; r: string; b?: boolean }) {
  return <div className={`flex justify-between py-1.5 text-sm ${b ? "font-semibold text-slate-900" : "text-slate-600"}`}><span>{l}</span><span>{r}</span></div>;
}

export default function PayslipsPage() {
  const toast = useToast();
  const [view, setView] = useState<(typeof PAYSLIPS)[number] | null>(null);
  const me = SALARIES[1];
  const calc = (unpaid: number) => calcPay({ ...me, unpaid });
  const v = view ? calc(view.unpaid) : null;

  return (
    <>
      <PageHeader title="Payslips" desc="Your monthly salary slips." />
      <Card>
        <Table>
          <thead><tr><Th>Month</Th><Th>Net salary</Th><Th>Paid on</Th><Th>Status</Th><Th /></tr></thead>
          <tbody>
            {PAYSLIPS.map((p) => (
              <tr key={p.id}>
                <Td className="font-medium text-slate-900">{p.month}</Td><Td>{fmtINR(calc(p.unpaid).net)}</Td><Td>{fmtDate(p.paidOn)}</Td><Td><Badge tone="green" dot>Paid</Badge></Td>
                <Td className="text-right"><div className="flex justify-end gap-2"><Btn size="sm" variant="outline" icon={Eye} onClick={() => setView(p)}>View</Btn><Btn size="sm" variant="ghost" icon={Download} onClick={() => toast("Payslip download started")}>PDF</Btn></div></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Modal open={!!view} onClose={() => setView(null)} title={`Payslip, ${view?.month ?? ""}`} desc="Acme Technologies Pvt Ltd" wide
        footer={<><Btn variant="outline" onClick={() => setView(null)}>Close</Btn><Btn icon={Download} onClick={() => toast("Payslip download started")}>Download PDF</Btn></>}>
        {v && view && (
          <div>
            <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm"><div><p className="text-slate-500">Employee</p><p className="font-medium">Rohan Patil (ACM-014)</p></div><div><p className="text-slate-500">Designation</p><p className="font-medium">Senior Engineer</p></div><div><p className="text-slate-500">Paid days</p><p className="font-medium">{WORKING_DAYS - view.unpaid} of {WORKING_DAYS}</p></div><div><p className="text-slate-500">Paid on</p><p className="font-medium">{fmtDate(view.paidOn)}</p></div></div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Earnings</p><Row l="Basic" r={fmtINR(me.basic)} /><Row l="HRA" r={fmtINR(me.hra)} /><Row l="Other allowances" r={fmtINR(me.other)} /><Row l="Gross" r={fmtINR(v.gross)} b /></div>
              <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Deductions</p><Row l="Fixed deductions" r={fmtINR(me.fixed)} />{view.unpaid > 0 && <Row l={`Unpaid leave (${view.unpaid} day)`} r={fmtINR(v.unpaidDed)} />}<Row l="Total deductions" r={fmtINR(v.deductions)} b /></div>
            </div>
            <div className="mt-5 flex items-center justify-between rounded-lg bg-indigo-50 px-4 py-3"><span className="font-medium text-indigo-900">Net salary</span><span className="text-xl font-semibold text-indigo-900">{fmtINR(v.net)}</span></div>
          </div>
        )}
      </Modal>
    </>
  );
}
