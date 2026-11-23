"use client";

import { useEffect, useState } from "react";
import { Download, Eye, Loader2, FileText, CheckCircle2, Clock, Printer, Paperclip, ExternalLink } from "lucide-react";
import { Badge, Btn, Card, PageHeader, Table, Td, Th } from "@/components/ui";
import { Modal, useToast } from "@/components/interactive";
import { fmtINR } from "@/lib/dates";

interface SalaryComponent {
  name: string;
  type: "earning" | "deduction";
  mode?: "amount" | "percentage";
  percentage?: number;
  amount: number;
}

interface PayslipItem {
  id: number;
  month: string;
  paidOn: string | null;
  status: string;
  slipStatus: "Not Requested" | "Requested" | "Raised";
  isRaised: boolean;
  requestedAt: string | null;
  raisedAt: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  fileSize?: string | null;
  fileType?: string | null;
  notes?: string | null;
  employeeName: string;
  employeeCode: string;
  title: string;
  department: string;
  companyName: string;
  inHandSalary: number;
  components: SalaryComponent[];
  totalEarnings: number;
  totalComponentDeductions: number;
  availableLeaves: number;
  carryForwardLeaves: number;
  currentMonthCredited: number;
  leavesTaken: number;
  excessLeaves: number;
  perLeaveRate: number;
  leaveDeduction: number;
  net: number;
}

function Row({ l, r, b, isDeduction }: { l: string; r: string; b?: boolean; isDeduction?: boolean }) {
  return (
    <div
      className={`flex justify-between py-1.5 text-xs ${
        b ? "font-bold text-slate-900 border-t border-line mt-1.5 pt-2 text-sm" : "text-slate-600"
      }`}
    >
      <span>{l}</span>
      <span className={`num font-semibold ${isDeduction ? "text-rose-600" : "text-slate-900"}`}>{r}</span>
    </div>
  );
}

export default function PayslipsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [requestingMonth, setRequestingMonth] = useState<string | null>(null);
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

  const handleRequestSlip = async (month: string) => {
    setRequestingMonth(month);
    try {
      const res = await fetch("/api/employee/payslips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_slip", month }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");

      toast(json.message || `Salary slip requested for ${month}`);
      await fetchPayslips();
    } catch (err: any) {
      toast(err.message || "Failed to request salary slip");
    } finally {
      setRequestingMonth(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <PageHeader
        title="My Salary Slips"
        sub="Request and access your verified monthly salary compensation slips, allowances breakdown, and HR uploaded documents."
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
                <Th>Net Take-Home</Th>
                <Th>Salary Cycle & Paid On</Th>
                <Th>Slip Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {payslips.map((p) => (
                <tr key={p.month} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-semibold text-slate-900">{p.month}</td>
                  <td className="py-3 px-4 num font-bold text-slate-900">{fmtINR(p.net)}</td>
                  <td className="py-3 px-4 text-xs">
                    {p.status === "Paid" ? (
                      <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Paid on {p.paidOn || "1st of month"}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                        <Clock className="w-3.5 h-3.5" /> Pending Payment (Cycle: 1st)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {p.slipStatus === "Raised" ? (
                      <Badge tone="green">Slip Released</Badge>
                    ) : p.slipStatus === "Requested" ? (
                      <Badge tone="amber">Requested · Awaiting HR</Badge>
                    ) : (
                      <Badge tone="slate">Not Requested</Badge>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {p.slipStatus === "Raised" ? (
                      <div className="flex justify-end gap-2 items-center">
                        {p.fileUrl && (
                          <a
                            href={p.fileUrl}
                            download={p.fileName || `Salary_Slip_${p.month}.pdf`}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition shadow-2xs"
                            title="Download HR uploaded slip file"
                          >
                            <Download className="w-3.5 h-3.5" /> Download Slip
                          </a>
                        )}
                        <Btn size="sm" variant="outline" icon={Eye} onClick={() => setView(p)}>
                          View Details
                        </Btn>
                      </div>
                    ) : p.slipStatus === "Requested" ? (
                      <span className="text-xs text-amber-700 font-medium italic">
                        Waiting for HR to upload slip
                      </span>
                    ) : (
                      <button
                        disabled={requestingMonth === p.month}
                        onClick={() => handleRequestSlip(p.month)}
                        className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-teal-800 transition disabled:opacity-50"
                      >
                        {requestingMonth === p.month ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                        Request Salary Slip
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* OFFICIAL SALARY SLIP VIEW MODAL */}
      {view && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-line max-h-[95vh] overflow-y-auto print:max-w-none print:shadow-none print:border-none print:p-0">
            {/* Header / Company Logo & Slip Title */}
            <div className="flex flex-wrap items-start justify-between border-b border-line pb-4 print:border-b-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{view.companyName}</h2>
                <p className="text-xs text-mute mt-0.5">Official Monthly Salary Compensation Slip</p>
                <p className="text-xs font-bold text-pine mt-1">Pay Period: {view.month}</p>
              </div>
              <div className="text-right text-xs">
                <span className="inline-block rounded-md bg-emerald-100 px-2.5 py-1 font-bold text-emerald-800">
                  Status: {view.status}
                </span>
                <p className="text-mute mt-1">Disbursed on: {view.paidOn || "1st of month"}</p>
                <p className="text-mute">Cycle date: 1st of month</p>
              </div>
            </div>

            {/* If HR Uploaded a Slip File */}
            {view.fileUrl && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 text-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shrink-0">
                    <Paperclip className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-blue-900">
                      Official Signed Salary Slip Attached: {view.fileName || "Salary_Slip.pdf"}
                    </p>
                    <p className="text-[11px] text-blue-700">
                      {view.fileSize || "PDF"} {view.notes ? `· "${view.notes}"` : ""}
                    </p>
                  </div>
                </div>

                <a
                  href={view.fileUrl}
                  download={view.fileName || `Salary_Slip_${view.month}.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white shadow-xs hover:bg-blue-700 transition"
                >
                  <Download className="w-3.5 h-3.5" /> Download Attached Slip
                </a>
              </div>
            )}

            {/* Employee Information Card */}
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-line bg-slate-50/60 p-3.5 text-xs">
              <div>
                <span className="text-mute block text-[11px]">Employee Name</span>
                <span className="font-bold text-slate-900 text-sm">{view.employeeName}</span>
              </div>
              <div>
                <span className="text-mute block text-[11px]">Employee Code</span>
                <span className="font-semibold text-slate-900">{view.employeeCode}</span>
              </div>
              <div>
                <span className="text-mute block text-[11px]">Designation</span>
                <span className="font-semibold text-slate-900">{view.title}</span>
              </div>
              <div>
                <span className="text-mute block text-[11px]">Department</span>
                <span className="font-semibold text-slate-900">{view.department}</span>
              </div>
            </div>

            {/* Earnings Breakdown */}
            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-line pb-1">
                Salary Segregation Breakdown (% & ₹)
              </h4>
              <div className="divide-y divide-slate-100">
                {view.components
                  .filter((c) => c.type === "earning")
                  .map((c, i) => (
                    <Row
                      key={i}
                      l={`${c.name} ${c.percentage ? `(${c.percentage}%)` : ""}`}
                      r={fmtINR(c.amount)}
                    />
                  ))}
                <Row l="Gross Monthly In-Hand Salary" r={fmtINR(view.inHandSalary)} b />
              </div>
            </div>

            {/* Leave Deductions Calculation Box */}
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-2">
                Leave Balance & Carry Forward Deductions
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
                <div className="rounded-lg bg-white border border-amber-200 p-2">
                  <span className="text-mute block text-[10px]">Carry Forward</span>
                  <span className="font-bold text-slate-800">{view.carryForwardLeaves} days</span>
                </div>
                <div className="rounded-lg bg-white border border-amber-200 p-2">
                  <span className="text-mute block text-[10px]">Monthly Credit</span>
                  <span className="font-bold text-slate-800">{view.currentMonthCredited} days</span>
                </div>
                <div className="rounded-lg bg-white border border-amber-200 p-2">
                  <span className="text-mute block text-[10px]">Total Available</span>
                  <span className="font-bold text-blue-700">{view.availableLeaves} days</span>
                </div>
                <div className="rounded-lg bg-white border border-amber-200 p-2">
                  <span className="text-mute block text-[10px]">Leaves Taken</span>
                  <span className="font-bold text-slate-800">{view.leavesTaken} days</span>
                </div>
              </div>

              <div className="space-y-1 text-xs pt-1 border-t border-amber-200/80">
                <div className="flex justify-between">
                  <span className="text-amber-900 font-medium">Excess Leaves Deducted:</span>
                  <span className="font-bold text-rose-700">{view.excessLeaves} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-900 font-medium">Deduction Rate per Leave:</span>
                  <span className="font-bold text-slate-700">₹{view.perLeaveRate} / day</span>
                </div>
                <div className="flex justify-between text-rose-800 font-bold border-t border-amber-200/80 pt-1">
                  <span>Total Leave Deduction:</span>
                  <span>-{fmtINR(view.leaveDeduction)}</span>
                </div>
              </div>
            </div>

            {/* Net Salary Summary */}
            <div className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">
                    Net Take-Home Salary
                  </span>
                  <p className="text-3xl font-extrabold text-emerald-900 num mt-0.5">
                    {fmtINR(view.net)}
                  </p>
                </div>
                <div className="text-right text-xs space-y-0.5">
                  <p className="text-slate-600">Base In-Hand: {fmtINR(view.inHandSalary)}</p>
                  <p className="text-rose-700 font-medium">Leave Deductions: -{fmtINR(view.leaveDeduction)}</p>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="mt-6 flex items-center justify-end gap-2 border-t border-line pt-4 print:hidden">
              <Btn variant="outline" onClick={() => setView(null)}>
                Close
              </Btn>
              <Btn icon={Printer} onClick={handlePrint}>
                Print Salary Slip
              </Btn>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
