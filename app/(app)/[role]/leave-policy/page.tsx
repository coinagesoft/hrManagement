"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Settings, ShieldCheck, CheckCircle2, XCircle, AlertCircle, Calendar, RefreshCw } from "lucide-react";
import { Badge, Btn, Card, PageHeader, SectionLoader, Stat } from "@/components/ui";
import { Field, Modal, inputCls, useToast } from "@/components/interactive";
import { useRole } from "@/lib/role";

interface LeaveType {
  id: number;
  name: string;
  code: string;
  description: string;
  category: "paid" | "unpaid";
  cycleMonths: number;
  quotaPerCycle: number;
  annualTotal: number;
  carryForward: boolean;
  maxCarryForward: number;
  isActive: boolean;
}

interface GeneralPolicy {
  workingDays: number;
}

export default function LeavePolicyPage() {
  const toast = useToast();
  const role = useRole();
  const isAdmin = role === "admin" || role === "super";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [generalPolicy, setGeneralPolicy] = useState<GeneralPolicy>({ workingDays: 22 });

  // Add Modal State
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState({
    name: "",
    code: "",
    description: "",
    category: "paid" as "paid" | "unpaid",
    cyclePreset: "4", // Default to 4-month quarter
    customMonths: 4,
    quotaPerCycle: 2.0,
    carryForward: true,
  });

  // Edit Modal State
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    code: "",
    description: "",
    category: "paid" as "paid" | "unpaid",
    cycleMonths: 1,
    quotaPerCycle: 1.0,
    carryForward: true,
    isActive: true,
  });

  // Working Days Modal State
  const [editingWorkingDays, setEditingWorkingDays] = useState(false);
  const [workingDaysValue, setWorkingDaysValue] = useState(22);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [typesRes, policyRes] = await Promise.all([
        fetch("/api/admin/leave-types"),
        fetch("/api/hr/leave-policy"),
      ]);

      const typesJson = await typesRes.json();
      const policyJson = await policyRes.json();

      if (typesJson?.success && Array.isArray(typesJson.leaveTypes)) {
        setLeaveTypes(typesJson.leaveTypes);
      }
      if (policyJson?.success && policyJson.policy) {
        setGeneralPolicy({ workingDays: policyJson.policy.workingDays || 22 });
        setWorkingDaysValue(policyJson.policy.workingDays || 22);
      }
    } catch (err) {
      console.error("Failed to fetch leave policy data:", err);
      toast("Failed to load leave types & policy");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute cycle months for Add form
  const getAddCycleMonths = () => {
    if (newType.category === "unpaid") return 1;
    if (newType.cyclePreset === "custom") return Math.max(1, Math.min(12, Number(newType.customMonths) || 1));
    return Number(newType.cyclePreset) || 1;
  };

  const addCycleMonths = getAddCycleMonths();
  const addAnnualTotal =
    newType.category === "unpaid"
      ? 0
      : Math.round((12 / addCycleMonths) * (Number(newType.quotaPerCycle) || 0) * 10) / 10;

  // Handle Create Leave Type
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newType.name.trim()) return toast("Leave type name is required");
    if (!newType.code.trim()) return toast("Leave type code is required");

    setSaving(true);
    try {
      const cycleMonths = getAddCycleMonths();
      const quota = newType.category === "unpaid" ? 0 : Number(newType.quotaPerCycle) || 0;

      const res = await fetch("/api/admin/leave-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newType.name.trim(),
          code: newType.code.trim().toUpperCase(),
          description: newType.description.trim(),
          category: newType.category,
          cycleMonths,
          quotaPerCycle: quota,
          carryForward: newType.carryForward,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create leave type");

      toast(json.message || "Leave type created successfully");
      setAdding(false);
      setNewType({
        name: "",
        code: "",
        description: "",
        category: "paid",
        cyclePreset: "4",
        customMonths: 4,
        quotaPerCycle: 2.0,
        carryForward: true,
      });
      await fetchData();
    } catch (err: any) {
      toast(err.message || "Creation failed");
    } finally {
      setSaving(false);
    }
  };

  // Open Edit Modal
  const openEdit = (lt: LeaveType) => {
    setEditing(lt);
    setEditForm({
      name: lt.name,
      code: lt.code,
      description: lt.description,
      category: lt.category,
      cycleMonths: lt.cycleMonths,
      quotaPerCycle: lt.quotaPerCycle,
      carryForward: lt.carryForward,
      isActive: lt.isActive,
    });
  };

  // Handle Update Leave Type
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editForm.name.trim()) return toast("Leave type name is required");
    if (!editForm.code.trim()) return toast("Leave type code is required");

    setSaving(true);
    try {
      const res = await fetch("/api/admin/leave-types", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          name: editForm.name.trim(),
          code: editForm.code.trim().toUpperCase(),
          description: editForm.description.trim(),
          category: editForm.category,
          cycleMonths: editForm.category === "unpaid" ? 1 : editForm.cycleMonths,
          quotaPerCycle: editForm.category === "unpaid" ? 0 : editForm.quotaPerCycle,
          carryForward: editForm.carryForward,
          isActive: editForm.isActive,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update leave type");

      toast("Leave type updated successfully");
      setEditing(null);
      await fetchData();
    } catch (err: any) {
      toast(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  // Handle Toggle Active/Inactive
  const handleToggleActive = async (lt: LeaveType) => {
    try {
      const res = await fetch("/api/admin/leave-types", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lt.id,
          isActive: !lt.isActive,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Toggle failed");

      toast(`"${lt.name}" is now ${!lt.isActive ? "active" : "inactive"}`);
      await fetchData();
    } catch (err: any) {
      toast(err.message || "Action failed");
    }
  };

  // Handle Delete Leave Type
  const handleDelete = async (lt: LeaveType) => {
    if (!confirm(`Are you sure you want to remove or deactivate "${lt.name}" (${lt.code})?`)) return;

    try {
      const res = await fetch(`/api/admin/leave-types?id=${lt.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");

      toast(json.message || "Leave type removed");
      await fetchData();
    } catch (err: any) {
      toast(err.message || "Delete failed");
    }
  };

  // Handle Save Working Days
  const handleSaveWorkingDays = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/hr/leave-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workingDays: workingDaysValue,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");

      toast("Payroll working days standard updated");
      setGeneralPolicy({ workingDays: workingDaysValue });
      setEditingWorkingDays(false);
    } catch (err: any) {
      toast(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const getCycleLabel = (cycleMonths: number) => {
    if (cycleMonths === 1) return "Monthly (1 month)";
    if (cycleMonths === 3) return "Standard Quarter (3 months)";
    if (cycleMonths === 4) return "4-Month Quarter (3x / year)";
    if (cycleMonths === 6) return "Half-Yearly (6 months)";
    if (cycleMonths === 12) return "Annual (12 months)";
    return `Every ${cycleMonths} months`;
  };

  return (
    <>
      <PageHeader
        title="Leave Types & Policy"
        sub="Define company leave types, accrual cycle frequencies (e.g. 4-month quarters, monthly), and carry-forward rules."
        actions={
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <>
                <Btn variant="outline" icon={Settings} onClick={() => setEditingWorkingDays(true)}>
                  Working Days ({generalPolicy.workingDays})
                </Btn>
                <Btn icon={Plus} onClick={() => setAdding(true)}>
                  Add Leave Type
                </Btn>
              </>
            ) : null}
          </div>
        }
      />

      {/* Explanatory Policy Banner */}
      <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-xs text-sky-950 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <p className="font-semibold text-sky-950 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-600" />
            Leave Accrual & Cycle Policy
          </p>
          <p className="text-sky-800 leading-relaxed">
            Cycles can be set to <b>Monthly (1 mo)</b>, <b>Custom Quarter (e.g. 4 months = 3 cycles/yr, 2 days/cycle = 6 annual)</b>, or <b>Standard Quarters (3 mo)</b>. Quotas credit automatically per cycle.
          </p>
        </div>
        <div className="rounded-lg bg-white border border-sky-200 px-3.5 py-2 font-mono text-sky-800 text-xs shadow-xs space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-sky-500 block">Formula Example</span>
          <span>4-Month Quarter: (12 / 4) × 2 = 6 days/yr</span>
        </div>
      </div>

      {loading ? (
        <SectionLoader message="Loading leave types & policy..." />
      ) : (
        <div className="space-y-6">
          {/* Leave Types Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {leaveTypes.map((lt) => {
              const isPaid = lt.category === "paid";
              return (
                <Card key={lt.id} className="p-5 flex flex-col justify-between relative overflow-hidden">
                  {!lt.isActive && (
                    <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl">
                      Inactive
                    </div>
                  )}

                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-slate-900 text-base flex items-center gap-2">
                          {lt.name}
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                            {lt.code}
                          </span>
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Badge tone={isPaid ? "green" : "amber"}>
                            {isPaid ? "Paid Leave" : "Unpaid (LWP)"}
                          </Badge>
                          <Badge tone={lt.isActive ? "teal" : "rose"}>
                            {lt.isActive ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                      </div>

                      <div className="text-right">
                        {isPaid ? (
                          <>
                            <span className="text-2xl font-bold text-slate-900">{lt.quotaPerCycle}</span>
                            <span className="block text-[11px] text-slate-500 font-medium">
                              days / {lt.cycleMonths === 1 ? "month" : `${lt.cycleMonths}-mo cycle`}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-base font-bold text-amber-700">Unlimited</span>
                            <span className="block text-[11px] text-slate-500">payroll deduction</span>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-600 line-clamp-2">
                      {lt.description || (isPaid ? `${lt.quotaPerCycle} days credited every ${lt.cycleMonths} month(s).` : "Unpaid leave without quota restrictions.")}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                      {isPaid && (
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="text-slate-500">Annual Entitlement:</span>
                          <span className="font-semibold text-slate-900">
                            {lt.annualTotal} days / year
                            <span className="text-slate-400 font-normal ml-1">
                              ({Math.floor(12 / lt.cycleMonths)} cycles)
                            </span>
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-slate-500">Accrual Cycle:</span>
                        <span className="font-medium text-slate-800">{getCycleLabel(lt.cycleMonths)}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-slate-500">Carry Forward:</span>
                        <span className={`font-medium ${lt.carryForward ? "text-emerald-700" : "text-slate-500"}`}>
                          {lt.carryForward ? "Active (Rollover)" : "Resets Each Cycle"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(lt)}
                        className={`text-xs font-medium px-2 py-1 rounded transition ${
                          lt.isActive
                            ? "text-slate-600 hover:bg-slate-100"
                            : "text-emerald-700 hover:bg-emerald-50 bg-emerald-50/50"
                        }`}
                      >
                        {lt.isActive ? "Deactivate" : "Activate"}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <Btn size="sm" variant="outline" icon={Pencil} onClick={() => openEdit(lt)}>
                          Edit
                        </Btn>
                        <button
                          type="button"
                          onClick={() => handleDelete(lt)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Remove or deactivate leave type"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Working Days & Payroll Denominator Card */}
          <Card className="p-5 bg-slate-50/70 border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-600" />
                  Payroll Calculation Standard: {generalPolicy.workingDays} Working Days / Month
                </h4>
                <p className="mt-1 text-xs text-slate-600 max-w-2xl">
                  Used as the denominator to calculate the exact per-day salary deduction when an employee takes Unpaid Leave / Leave Without Pay (LWP).
                </p>
              </div>
              {isAdmin && (
                <Btn size="sm" variant="outline" icon={Settings} onClick={() => setEditingWorkingDays(true)}>
                  Change Standard
                </Btn>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ADD LEAVE TYPE MODAL */}
      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add Custom Leave Type"
        desc="Create a new leave type for your company with customizable accrual cycles and quotas."
        footer={
          <>
            <Btn variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Btn>
            <Btn type="submit" form="add-leave-type-form" disabled={saving}>
              {saving ? "Creating..." : "Create Leave Type"}
            </Btn>
          </>
        }
      >
        <form id="add-leave-type-form" className="space-y-4" onSubmit={handleCreate}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Leave Type Name" hint="e.g. Sick Leave, Casual Leave, Paid Time Off">
              <input
                type="text"
                required
                placeholder="Sick Leave"
                className={inputCls}
                value={newType.name}
                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
              />
            </Field>

            <Field label="Short Code" hint="2-4 characters, e.g. SL, CL, PTO">
              <input
                type="text"
                required
                maxLength={10}
                placeholder="SL"
                className={`${inputCls} uppercase font-mono`}
                value={newType.code}
                onChange={(e) => setNewType({ ...newType, code: e.target.value.toUpperCase() })}
              />
            </Field>
          </div>

          <Field label="Leave Category">
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer text-xs font-medium transition ${
                  newType.category === "paid"
                    ? "border-emerald-500 bg-emerald-50/60 text-emerald-950 font-semibold shadow-xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="add_category"
                  className="accent-emerald-600"
                  checked={newType.category === "paid"}
                  onChange={() => setNewType({ ...newType, category: "paid" })}
                />
                <div>
                  <span className="block text-slate-900 font-semibold">Paid Leave</span>
                  <span className="text-[11px] text-slate-500">Quota accrued each cycle</span>
                </div>
              </label>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer text-xs font-medium transition ${
                  newType.category === "unpaid"
                    ? "border-amber-500 bg-amber-50/60 text-amber-950 font-semibold shadow-xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="add_category"
                  className="accent-amber-600"
                  checked={newType.category === "unpaid"}
                  onChange={() => setNewType({ ...newType, category: "unpaid" })}
                />
                <div>
                  <span className="block text-slate-900 font-semibold">Unpaid (LWP)</span>
                  <span className="text-[11px] text-slate-500">No quota, payroll deduction</span>
                </div>
              </label>
            </div>
          </Field>

          {newType.category === "paid" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Accrual Frequency / Cycle" hint="How often quota is credited">
                  <select
                    className={inputCls}
                    value={newType.cyclePreset}
                    onChange={(e) => setNewType({ ...newType, cyclePreset: e.target.value })}
                  >
                    <option value="1">Monthly (Every 1 Month — 12 cycles/yr)</option>
                    <option value="3">Standard Quarter (Every 3 Months — 4 cycles/yr)</option>
                    <option value="4">Custom 4-Month Quarter (Every 4 Months — 3 cycles/yr)</option>
                    <option value="6">Half-Yearly (Every 6 Months — 2 cycles/yr)</option>
                    <option value="12">Annual (Every 12 Months — 1 cycle/yr)</option>
                    <option value="custom">Custom Months Cycle...</option>
                  </select>
                </Field>

                {newType.cyclePreset === "custom" ? (
                  <Field label="Cycle Length (in Months)" hint="1 to 12 months">
                    <input
                      type="number"
                      min={1}
                      max={12}
                      className={inputCls}
                      value={newType.customMonths}
                      onChange={(e) => setNewType({ ...newType, customMonths: Math.max(1, Math.min(12, Number(e.target.value))) })}
                    />
                  </Field>
                ) : (
                  <Field label="Quota per Cycle (days)" hint="e.g. 2.0 or 1.5 days">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="50"
                      className={inputCls}
                      value={newType.quotaPerCycle}
                      onChange={(e) => setNewType({ ...newType, quotaPerCycle: Number(e.target.value) })}
                    />
                  </Field>
                )}
              </div>

              {newType.cyclePreset === "custom" && (
                <Field label="Quota per Cycle (days)" hint="e.g. 2.0 or 1.5 days">
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="50"
                    className={inputCls}
                    value={newType.quotaPerCycle}
                    onChange={(e) => setNewType({ ...newType, quotaPerCycle: Number(e.target.value) })}
                  />
                </Field>
              )}

              {/* Dynamic Calculation Preview */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950 space-y-1">
                <span className="font-semibold text-emerald-900 block">
                  📊 Live Annual Calculation:
                </span>
                <p className="font-mono text-emerald-800 font-semibold">
                  {newType.quotaPerCycle} days every {addCycleMonths} month(s) = {addAnnualTotal} days / year
                  <span className="font-sans font-normal text-emerald-700 ml-1">
                    ({Math.floor(12 / addCycleMonths)} accrual cycles per year)
                  </span>
                </p>
                {addCycleMonths === 4 && (
                  <p className="text-[11px] text-emerald-700">
                    💡 Cycle Breakdown: Jan-Apr: +{newType.quotaPerCycle}d, May-Aug: +{newType.quotaPerCycle}d, Sep-Dec: +{newType.quotaPerCycle}d = {addAnnualTotal}d total.
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-pine"
                    checked={newType.carryForward}
                    onChange={(e) => setNewType({ ...newType, carryForward: e.target.checked })}
                  />
                  <div>
                    <span className="font-semibold text-slate-900 block">
                      Enable Carry Forward across cycles
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Unused quota carries over automatically into subsequent cycles without expiring.
                    </span>
                  </div>
                </label>
              </div>
            </>
          )}

          <Field label="Description / Notes" hint="Optional explanation shown to employees">
            <textarea
              rows={2}
              className={inputCls}
              placeholder="e.g. 2 days credited every 4 months (6 annual total)."
              value={newType.description}
              onChange={(e) => setNewType({ ...newType, description: e.target.value })}
            />
          </Field>
        </form>
      </Modal>

      {/* EDIT LEAVE TYPE MODAL */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.name || "Leave Type"}`}
        desc="Update accrual quota, cycle length, or status for this leave type."
        footer={
          <>
            <Btn variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Btn>
            <Btn type="submit" form="edit-leave-type-form" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Btn>
          </>
        }
      >
        {editing && (
          <form id="edit-leave-type-form" className="space-y-4" onSubmit={handleUpdate}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Leave Type Name">
                <input
                  type="text"
                  required
                  className={inputCls}
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </Field>

              <Field label="Short Code">
                <input
                  type="text"
                  required
                  maxLength={10}
                  className={`${inputCls} uppercase font-mono`}
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                />
              </Field>
            </div>

            <Field label="Leave Category">
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer text-xs font-medium transition ${
                    editForm.category === "paid"
                      ? "border-emerald-500 bg-emerald-50/60 text-emerald-950 font-semibold"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="edit_category"
                    className="accent-emerald-600"
                    checked={editForm.category === "paid"}
                    onChange={() => setEditForm({ ...editForm, category: "paid" })}
                  />
                  <span>Paid Leave</span>
                </label>

                <label
                  className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer text-xs font-medium transition ${
                    editForm.category === "unpaid"
                      ? "border-amber-500 bg-amber-50/60 text-amber-950 font-semibold"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="edit_category"
                    className="accent-amber-600"
                    checked={editForm.category === "unpaid"}
                    onChange={() => setEditForm({ ...editForm, category: "unpaid" })}
                  />
                  <span>Unpaid (LWP)</span>
                </label>
              </div>
            </Field>

            {editForm.category === "paid" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Accrual Cycle (Months)" hint="1=mo, 3=qtr, 4=4-mo qtr, 12=yr">
                    <input
                      type="number"
                      min={1}
                      max={12}
                      className={inputCls}
                      value={editForm.cycleMonths}
                      onChange={(e) =>
                        setEditForm({ ...editForm, cycleMonths: Math.max(1, Math.min(12, Number(e.target.value))) })
                      }
                    />
                  </Field>

                  <Field label="Quota per Cycle (days)">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="50"
                      className={inputCls}
                      value={editForm.quotaPerCycle}
                      onChange={(e) => setEditForm({ ...editForm, quotaPerCycle: Number(e.target.value) })}
                    />
                  </Field>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-950">
                  Annual total: <b>{Math.round((12 / editForm.cycleMonths) * editForm.quotaPerCycle * 10) / 10} days/year</b> ({Math.floor(12 / editForm.cycleMonths)} cycles).
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-800">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded accent-pine"
                      checked={editForm.carryForward}
                      onChange={(e) => setEditForm({ ...editForm, carryForward: e.target.checked })}
                    />
                    <span>Carry forward unused leaves across cycles</span>
                  </label>
                </div>
              </>
            )}

            <Field label="Status">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-800">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-pine"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                />
                <span>Active (available for employee selection)</span>
              </label>
            </Field>

            <Field label="Description / Notes">
              <textarea
                rows={2}
                className={inputCls}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </Field>
          </form>
        )}
      </Modal>

      {/* WORKING DAYS MODAL */}
      <Modal
        open={editingWorkingDays}
        onClose={() => setEditingWorkingDays(false)}
        title="Configure Standard Working Days"
        desc="Standard monthly working days used as the payroll denominator for unpaid leave deductions."
        footer={
          <>
            <Btn variant="outline" onClick={() => setEditingWorkingDays(false)}>
              Cancel
            </Btn>
            <Btn type="submit" form="working-days-form" disabled={saving}>
              {saving ? "Saving..." : "Save Standard"}
            </Btn>
          </>
        }
      >
        <form id="working-days-form" className="space-y-4" onSubmit={handleSaveWorkingDays}>
          <Field label="Monthly Working Days" hint="Standard is 22 days per month">
            <input
              type="number"
              min={15}
              max={31}
              className={inputCls}
              value={workingDaysValue}
              onChange={(e) => setWorkingDaysValue(Number(e.target.value))}
            />
          </Field>
          <p className="text-xs text-slate-500">
            For example: Daily salary rate = Monthly CTC / {workingDaysValue}. An employee with 2 days of unpaid leave (LWP) will have 2 × (Monthly CTC / {workingDaysValue}) deducted from payroll.
          </p>
        </form>
      </Modal>
    </>
  );
}
