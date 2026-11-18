"use client";

import { useEffect, useState } from "react";
import { Pencil, Loader2, CheckCircle2, Settings } from "lucide-react";
import { Badge, Btn, Card, PageHeader } from "@/components/ui";
import { Field, Modal, inputCls, useToast } from "@/components/interactive";

interface PolicyData {
  casual: number;
  sick: number;
  paid: number;
  workingDays: number;
}

export default function LeavePolicyPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<PolicyData>({
    casual: 1.0,
    sick: 1.0,
    paid: 12,
    workingDays: 22,
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
                <h3 className="font-semibold text-slate-900">Sick Leave</h3>
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

          {/* Paid / Annual Leave */}
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Annual Paid Leave</h3>
                <div className="mt-2 flex gap-2">
                  <Badge tone="green">Paid</Badge>
                  <Badge tone="teal">Annual Allocation</Badge>
                </div>
              </div>
              <p className="text-right">
                <span className="text-3xl font-semibold text-slate-900">{policy.paid}</span>
                <span className="block text-xs text-slate-500">days / year</span>
              </p>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Credited annually. Unused days are subject to company carryover rules.
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
            <div className="grid grid-cols-2 gap-4">
              <Field label="Casual leave (per month)">
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
              <Field label="Sick leave (per month)">
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
              <Field label="Paid leave (per year)">
                <input
                  type="number"
                  className={inputCls}
                  value={editing.paid}
                  onChange={(e) =>
                    setEditing({ ...editing, paid: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Working days / month">
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
          </form>
        )}
      </Modal>
    </>
  );
}
