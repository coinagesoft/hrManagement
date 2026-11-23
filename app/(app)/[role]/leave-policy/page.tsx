"use client";

import { useEffect, useState } from "react";
import { Pencil, Loader2, CheckCircle2, Settings } from "lucide-react";
import { Badge, Btn, Card, PageHeader } from "@/components/ui";
import { Field, Modal, inputCls, useToast } from "@/components/interactive";

interface PolicyData {
  casual: number;
  sick: number;
  workingDays: number;
  carryForwardEnabled?: boolean;
}

export default function LeavePolicyPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<PolicyData>({
    casual: 1.5,
    sick: 1.0,
    workingDays: 22,
    carryForwardEnabled: true,
  });
  const [editing, setEditing] = useState<PolicyData | null>(null);

  const fetchPolicy = async () => {
    try {
      const res = await fetch("/api/hr/leave-policy");
      const json = await res.json();
      if (json?.success && json?.policy) {
        setPolicy(json.policy);
      }
    } catch (err) {
      console.error("Failed to fetch leave policy:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch("/api/hr/leave-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");

      toast("Leave quota policy updated successfully");
      setPolicy(editing);
      setEditing(null);
    } catch (err: any) {
      toast(err.message || "Failed to save policy");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Leave policy"
        sub="Define monthly leave accrual rates and working day standards. Applied dynamically across payroll and attendance."
        actions={
          <Btn icon={Settings} onClick={() => setEditing(policy)}>
            Configure policy
          </Btn>
        }
      />

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-pine" />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Casual Leave */}
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Casual Leave</h3>
                <div className="mt-2 flex gap-2">
                  <Badge tone="green">Paid</Badge>
                  <Badge tone="blue">Monthly Accrual</Badge>
                </div>
              </div>
              <p className="text-right">
                <span className="text-3xl font-semibold text-slate-900">{policy.casual}</span>
                <span className="block text-xs text-slate-500">days / month</span>
              </p>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Allocated at {policy.casual} day per month ({Math.round(policy.casual * 12)} days/year).
            </p>
          </Card>

          {/* Sick Leave */}
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Sick Leave (SL)</h3>
                <div className="mt-2 flex gap-2">
                  <Badge tone="green">Paid</Badge>
                  <Badge tone="blue">Monthly Accrual</Badge>
                </div>
              </div>
              <p className="text-right">
                <span className="text-3xl font-semibold text-slate-900">{policy.sick}</span>
                <span className="block text-xs text-slate-500">days / month</span>
              </p>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Allocated at {policy.sick} day per month ({Math.round(policy.sick * 12)} days/year).
            </p>
          </Card>

          {/* Working Days Standard */}
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Standard Working Days</h3>
                <div className="mt-2 flex gap-2">
                  <Badge tone="slate">Payroll Standard</Badge>
                </div>
              </div>
              <p className="text-right">
                <span className="text-3xl font-semibold text-slate-900">
                  {policy.workingDays}
                </span>
                <span className="block text-xs text-slate-500">days / month</span>
              </p>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Denominator for calculating per-day salary rate in payroll unpaid leave deductions.
            </p>
          </Card>

          {/* Carry Forward Card */}
          <Card className="p-5 sm:col-span-2 bg-emerald-50/50 border-emerald-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-emerald-950 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                  Monthly Accrual & Carry Forward Policy
                </h3>
                <div className="mt-2 flex gap-2">
                  <Badge tone={policy.carryForwardEnabled !== false ? "green" : "rose"}>
                    {policy.carryForwardEnabled !== false ? "Carry Forward Active" : "Disabled"}
                  </Badge>
                  <Badge tone="teal">Unlimited Carry Forward</Badge>
                </div>
              </div>
              <p className="text-right">
                <span className="text-sm font-semibold text-emerald-900">Live Simulation</span>
                <span className="block text-xs text-emerald-700">CL {policy.casual}/mo + SL {policy.sick}/mo</span>
              </p>
            </div>
            <div className="mt-4 rounded-lg bg-white border border-emerald-200 p-3 text-xs text-slate-700 space-y-1.5">
              <p className="font-medium text-slate-900">How Carry Forward works for employees:</p>
              <p>
                When an employee does not consume their monthly leave credit (e.g. <b>{policy.casual} CL/month</b>), it rolls over automatically to subsequent months.
              </p>
              <p className="font-mono text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200">
                Example: If an employee takes 0 leaves in Month 1, Month 2 available balance = {policy.casual} (carried forward) + {policy.casual} (current month) = {(policy.casual * 2).toFixed(1)} available leaves!
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Policy Modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Configure leave quota policy"
        desc="Updates will immediately apply to employee balances and monthly payroll runs."
        footer={
          <>
            <Btn variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Btn>
            <Btn type="submit" form="policy-form" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Btn>
          </>
        }
      >
        {editing && (
          <form id="policy-form" className="space-y-4" onSubmit={handleSave}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Casual leave (per month)" hint="e.g. 1.5 days / month">
                <input
                  type="number"
                  step="0.5"
                  className={inputCls}
                  value={editing.casual}
                  onChange={(e) =>
                    setEditing({ ...editing, casual: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Sick leave (per month)" hint="e.g. 1.0 day / month">
                <input
                  type="number"
                  step="0.5"
                  className={inputCls}
                  value={editing.sick}
                  onChange={(e) =>
                    setEditing({ ...editing, sick: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Working days / month" hint="Payroll denominator">
                <input
                  type="number"
                  className={inputCls}
                  value={editing.workingDays}
                  onChange={(e) =>
                    setEditing({ ...editing, workingDays: Number(e.target.value) })
                  }
                />
              </Field>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-pine"
                  checked={editing.carryForwardEnabled !== false}
                  onChange={(e) =>
                    setEditing({ ...editing, carryForwardEnabled: e.target.checked })
                  }
                />
                <span>Enable Monthly Leave Carry Forward (Unlimited)</span>
              </label>
              <p className="text-xs text-slate-600 pl-6">
                Unused casual/sick quota rolls over into subsequent months automatically without any cap (e.g. 1.5 unused + 1.5 new = 3.0 days).
              </p>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
