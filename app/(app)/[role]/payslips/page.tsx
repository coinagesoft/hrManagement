"use client";

import { useEffect, useState } from "react";
import { Download, Eye, Loader2, FileText } from "lucide-react";
import { Badge, Btn, Card, PageHeader, Table, Td, Th } from "@/components/ui";
import { Modal, useToast } from "@/components/interactive";
import { fmtDate, fmtINR } from "@/lib/dates";

interface PayslipItem {
  id: number;
  month: string;
  paidOn: string;
  status: string;
  employeeName: string;
  employeeCode: string;
  title: string;
  companyName: string;
  basic: number;
  hra: number;
  other: number;
  gross: number;
  unpaidDays: number;
  unpaidDed: number;
  fixed: number;
  net: number;
}

function Row({ l, r, b }: { l: string; r: string; b?: boolean }) {
  return (
    <div
      className={`flex justify-between py-1.5 text-sm ${
        b ? "font-semibold text-slate-900 border-t border-line mt-1 pt-2" : "text-slate-600"
      }`}
    >
      <span>{l}</span>
      <span className="num">{r}</span>
    </div>
  );
}

export default function PayslipsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [payslips, setPayslips] = useState<PayslipItem[]>([]);
  const [view, setView] = useState<PayslipItem | null>(null);

  const fetchPayslips = async () => {
    try {
      const res = await fetch("/api/employee/payslips");
      const json = await res.json();
      if (json?.success) {
        setPayslips(json.payslips);
      }
    } catch (err) {
      console.error("Failed to load payslips:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, []);

  return (
    <>
      <PageHeader
        title="Payslips"
        sub="Your verified monthly salary compensation slips, tax breakdowns, and payment history."
      />

      <Card flush>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-pine" />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Month</Th>
                <Th>Net salary</Th>
                <Th>Paid on</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {payslips.length === 0 ? (
                <tr>
                  <Td colSpan={5} className="py-8 text-center text-mute">
                    No finalized payslips available yet.
                  </Td>
                </tr>
              ) : (
                payslips.map((p) => (
                  <tr key={p.id}>
                    <Td className="font-medium text-slate-900">{p.month}</Td>
                    <Td className="num font-semibold text-slate-900">{fmtINR(p.net)}</Td>
                    <Td className="num text-mute">{p.paidOn}</Td>
                    <Td>
                      <Badge tone="green" dot>
                        {p.status}
                      </Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Btn size="sm" variant="outline" icon={Eye} onClick={() => setView(p)}>
                          View
                        </Btn>
                        <Btn
                          size="sm"
                          variant="ghost"
                          icon={Download}
                          onClick={() => toast(`Downloading ${p.month} payslip PDF...`)}
                        >
                          PDF
                        </Btn>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Payslip View Modal */}
      <Modal
        open={!!view}
        onClose={() => setView(null)}
        title={`Payslip for ${view?.month ?? ""}`}
        desc={view?.companyName || "Acme Technologies"}
        wide
        footer={
          <>
            <Btn variant="outline" onClick={() => setView(null)}>
              Close
            </Btn>
            <Btn
              icon={Download}
              onClick={() => {
                toast(`Downloading ${view?.month} payslip PDF`);
                setView(null);
              }}
            >
              Download PDF
            </Btn>
          </>
        }
      >
        {view && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-canvas p-4 text-sm border border-line">
              <div>
                <p className="text-xs text-mute uppercase font-semibold">Employee</p>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {view.employeeName} ({view.employeeCode})
                </p>
              </div>
              <div>
                <p className="text-xs text-mute uppercase font-semibold">Designation</p>
                <p className="font-semibold text-slate-900 mt-0.5">{view.title}</p>
              </div>
              <div>
                <p className="text-xs text-mute uppercase font-semibold">Pay Period</p>
                <p className="font-medium text-slate-800 mt-0.5">{view.month}</p>
              </div>
              <div>
                <p className="text-xs text-mute uppercase font-semibold">Payment Date</p>
                <p className="font-medium text-slate-800 mt-0.5">{view.paidOn}</p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-line p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-mute">
                  Earnings
                </p>
                <Row l="Basic Salary" r={fmtINR(view.basic)} />
                <Row l="HRA" r={fmtINR(view.hra)} />
                <Row l="Other Allowances" r={fmtINR(view.other)} />
                <Row l="Gross Earnings" r={fmtINR(view.gross)} b />
              </div>

              <div className="rounded-xl border border-line p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-mute">
                  Deductions
                </p>
                <Row l="Fixed Deductions" r={fmtINR(view.fixed)} />
                {view.unpaidDays > 0 ? (
                  <Row
                    l={`Unpaid Leave (${view.unpaidDays} day${view.unpaidDays > 1 ? "s" : ""})`}
                    r={`−${fmtINR(view.unpaidDed)}`}
                  />
                ) : (
                  <Row l="Unpaid Leave" r="₹0" />
                )}
                <Row l="Total Deductions" r={fmtINR(view.fixed + view.unpaidDed)} b />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-pine-soft border border-emerald-200 px-5 py-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-pine">
                  Net Salary Payable
                </span>
                <p className="text-xs text-mute">Directly deposited to bank account</p>
              </div>
              <span className="num text-2xl font-bold text-pine">{fmtINR(view.net)}</span>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
