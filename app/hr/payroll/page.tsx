"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Loader2, Pencil, Play, RotateCcw, AlertCircle } from "lucide-react";
import { Avatar, Badge, Btn, Card, PageHeader, StatusBadge, Table, Td, Th, Stat } from "@/components/ui";
import { Field, Modal, Tabs, inputCls, useToast } from "@/components/interactive";
import { fmtINR } from "@/lib/dates";

type Stage = "Draft" | "Finalised" | "Paid";

interface PayrollItem {
  userId: number;
  code: string;
  name: string;
  dept: string;
  title: string;
  basic: number;
  hra: number;
  other: number;
  gross: number;
  fixed: number;
  unpaidDays: number;
  unpaidDed: number;
  deductions: number;
  net: number;
  status: Stage;
}

interface SalaryStructure {
  id: number;
  userId: number;
  code: string;
  name: string;
  dept: string;
  title: string;
  basic: number;
  hra: number;
  other: number;
  fixed: number;
  gross: number;
}

export default function PayrollPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"run" | "structure">("run");
  const [month, setMonth] = useState("November 2026");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Payroll run data
  const [stage, setStage] = useState<Stage>("Draft");
  const [paidOn, setPaidOn] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    totalGross: 0,
    totalDeductions: 0,
    totalNet: 0,
    employeeCount: 0,
    totalUnpaidDays: 0,
  });
  const [items, setItems] = useState<PayrollItem[]>([]);

  // Salary structures
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [editingStructure, setEditingStructure] = useState<SalaryStructure | null>(null);

  const fetchPayroll = async () => {
    try {
      const res = await fetch(`/api/hr/payroll?month=${encodeURIComponent(month)}`);
      const json = await res.json();
      if (json?.success) {
        setStage(json.stage);
        setPaidOn(json.paidOn);
        setSummary(json.summary);
        setItems(json.items);
      }
    } catch (err) {
      console.error("Failed to fetch payroll:", err);
    }
  };

  const fetchStructures = async () => {
    try {
      const res = await fetch("/api/hr/salary-structure");
      const json = await res.json();
      if (json?.success) {
        setStructures(json.structures);
      }
    } catch (err) {
      console.error("Failed to fetch salary structures:", err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchPayroll(), fetchStructures()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [month]);

  const handleAction = async (action: "run_payroll" | "mark_paid" | "reset_draft") => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, month }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");

      toast(json.message || "Operation successful");
      await fetchPayroll();
    } catch (err: any) {
      toast(err.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveStructure = async () => {
    if (!editingStructure) return;
    try {
      const res = await fetch("/api/hr/salary-structure", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingStructure.userId,
          basic: editingStructure.basic,
          hra: editingStructure.hra,
          other: editingStructure.other,
          fixed: editingStructure.fixed,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");

      toast(`Saved salary structure for ${editingStructure.name}`);
      setEditingStructure(null);
      await loadAll();
    } catch (err: any) {
      toast(err.message || "Failed to update salary");
    }
  };

  const updateEditNum = (key: keyof SalaryStructure, val: number) => {
    if (!editingStructure) return;
    setEditingStructure({
      ...editingStructure,
      [key]: val,
    });
  };

  return (
    <>
      <PageHeader
        title="Payroll"
        sub={`${month}. Review attendance-based deductions, verify net pay, and manage monthly compensation.`}
        actions={
          <div className="flex items-center gap-2">
            {stage === "Draft" ? (
              <Btn
                icon={actionLoading ? Loader2 : Play}
                disabled={actionLoading || loading}
                onClick={() => handleAction("run_payroll")}
              >
                Run payroll
              </Btn>
            ) : stage === "Finalised" ? (
              <div className="flex gap-2">
                <Btn
                  variant="outline"
                  icon={RotateCcw}
                  disabled={actionLoading}
                  onClick={() => handleAction("reset_draft")}
                >
                  Reset to draft
                </Btn>
                <Btn
                  variant="success"
                  icon={actionLoading ? Loader2 : BadgeCheck}
                  disabled={actionLoading || loading}
                  onClick={() => handleAction("mark_paid")}
                >
                  Mark all as paid
                </Btn>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge tone="green" dot>
                  Paid {paidOn ? `on ${paidOn}` : "this cycle"}
                </Badge>
                <Btn
                  variant="outline"
                  size="sm"
                  icon={RotateCcw}
                  disabled={actionLoading}
                  onClick={() => handleAction("reset_draft")}
                >
                  Re-open
                </Btn>
              </div>
            )}
          </div>
        }
      />

      <Tabs
        tabs={[
          { id: "run", label: `${month} Run` },
          { id: "structure", label: "Salary structures" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-pine" />
        </div>
      ) : tab === "run" ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Net payable" value={fmtINR(summary.totalNet)} />
            <Stat label="Total gross" value={fmtINR(summary.totalGross)} />
            <Stat
              label="Unpaid leave days"
              value={summary.totalUnpaidDays}
              note="Calculated from attendance & leave records"
            />
            <Stat label="Status" value={stage} />
          </div>

          <Card flush>
            <Table>
              <thead>
                <tr>
                  <Th>Employee</Th>
                  <Th>Gross</Th>
                  <Th>Fixed deductions</Th>
                  <Th>Unpaid leave</Th>
                  <Th>Net salary</Th>
                  <Th>Status</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <Td colSpan={7} className="py-8 text-center text-mute">
                      No active employees found for this payroll run.
                    </Td>
                  </tr>
                ) : (
                  items.map((p) => (
                    <tr key={p.userId}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <Avatar name={p.name} />
                          <div>
                            <p className="font-medium text-slate-900">{p.name}</p>
                            <p className="text-xs text-mute">
                              {p.code} · {p.dept}
                            </p>
                          </div>
                        </div>
                      </Td>
                      <Td className="num">{fmtINR(p.gross)}</Td>
                      <Td className="num text-mute">{fmtINR(p.fixed)}</Td>
                      <Td>
                        {p.unpaidDays > 0 ? (
                          <span className="text-rose-600 font-medium">
                            {p.unpaidDays} day{p.unpaidDays > 1 ? "s" : ""} (−{fmtINR(p.unpaidDed)})
                          </span>
                        ) : (
                          <span className="text-mute">None</span>
                        )}
                      </Td>
                      <Td>
                        <b className="num font-semibold text-slate-900">{fmtINR(p.net)}</b>
                      </Td>
                      <Td>
                        <StatusBadge s={p.status} />
                      </Td>
                      <Td className="text-right">
                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => {
                            const match = structures.find((s) => s.userId === p.userId);
                            if (match) setEditingStructure(match);
                          }}
                        >
                          Adjust
                        </button>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Card>
          <p className="mt-3 text-xs text-mute">
            Unpaid deduction = (Gross / working days) × unpaid days. Deductions are dynamically calculated against remote MySQL records.
          </p>
        </>
      ) : (
        <Card flush>
          <Table>
            <thead>
              <tr>
                <Th>Employee</Th>
                <Th>Basic</Th>
                <Th>HRA</Th>
                <Th>Other allowances</Th>
                <Th>Fixed deductions</Th>
                <Th>Gross</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {structures.map((s) => (
                <tr key={s.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} />
                      <div>
                        <p className="font-medium text-slate-900">{s.name}</p>
                        <p className="text-xs text-mute">{s.title || s.dept}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="num">{fmtINR(s.basic)}</Td>
                  <Td className="num">{fmtINR(s.hra)}</Td>
                  <Td className="num">{fmtINR(s.other)}</Td>
                  <Td className="num">{fmtINR(s.fixed)}</Td>
                  <Td className="num font-semibold text-pine">{fmtINR(s.basic + s.hra + s.other)}</Td>
                  <Td className="text-right">
                    <Btn
                      size="sm"
                      variant="ghost"
                      icon={Pencil}
                      onClick={() => setEditingStructure(s)}
                    >
                      Edit
                    </Btn>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {/* Edit Salary Structure Modal */}
      <Modal
        open={!!editingStructure}
        onClose={() => setEditingStructure(null)}
        title="Edit salary structure"
        desc={editingStructure ? `${editingStructure.name} (${editingStructure.code})` : ""}
        footer={
          <>
            <Btn variant="outline" onClick={() => setEditingStructure(null)}>
              Cancel
            </Btn>
            <Btn onClick={handleSaveStructure}>Save structure</Btn>
          </>
        }
      >
        {editingStructure && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Basic (monthly ₹)">
                <input
                  type="number"
                  className={inputCls}
                  value={editingStructure.basic}
                  onChange={(e) => updateEditNum("basic", Number(e.target.value))}
                />
              </Field>
              <Field label="HRA (monthly ₹)">
                <input
                  type="number"
                  className={inputCls}
                  value={editingStructure.hra}
                  onChange={(e) => updateEditNum("hra", Number(e.target.value))}
                />
              </Field>
              <Field label="Other allowances (₹)">
                <input
                  type="number"
                  className={inputCls}
                  value={editingStructure.other}
                  onChange={(e) => updateEditNum("other", Number(e.target.value))}
                />
              </Field>
              <Field label="Fixed deductions (₹)">
                <input
                  type="number"
                  className={inputCls}
                  value={editingStructure.fixed}
                  onChange={(e) => updateEditNum("fixed", Number(e.target.value))}
                />
              </Field>
            </div>
            <div className="rounded-xl border border-line bg-canvas p-4 text-xs text-mute">
              <b>Calculated monthly gross:</b>{" "}
              {fmtINR(editingStructure.basic + editingStructure.hra + editingStructure.other)}.
              Changes take effect immediately on current and future payroll runs.
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
