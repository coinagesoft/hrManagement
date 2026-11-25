"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Wifi, Loader2, Clock, Calendar, ShieldCheck, AlertCircle, Pencil } from "lucide-react";
import { Btn, Card, CardHeader, PageHeader, Table, Td, Th, SectionLoader } from "@/components/ui";
import { Field, Modal, Tabs, inputCls, useToast } from "@/components/interactive";
import { DAYS_SHORT } from "@/lib/dates";
import { cn } from "@/lib/cn";

type Net = { id: string; label: string; ip: string; active: boolean };

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

export default function SettingsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"company" | "hours" | "leaves" | "network">("hours");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [companyName, setCompanyName] = useState("Acme Technologies Pvt Ltd");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [lateCutoffTime, setLateCutoffTime] = useState("09:15");
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [halfDayHours, setHalfDayHours] = useState(4);
  const [days, setDays] = useState([1, 2, 3, 4, 5]);

  // Leave types & working days states
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [workingDays, setWorkingDays] = useState(22);

  // Leave Type Modals & Form
  const [addingType, setAddingType] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [typeForm, setTypeForm] = useState({
    name: "",
    code: "",
    description: "",
    category: "paid" as "paid" | "unpaid",
    cyclePreset: "4",
    customMonths: 4,
    quotaPerCycle: 2.0,
    carryForward: true,
  });

  const [wifi, setWifi] = useState(true);
  const [wfh, setWfh] = useState({ enabled: true, sameDay: true, limit: 4 });
  const [nets, setNets] = useState<Net[]>([]);
  const [detectedIp, setDetectedIp] = useState("127.0.0.1");
  const [newNet, setNewNet] = useState({ label: "", ip: "" });

  const fetchLeaveTypes = async () => {
    try {
      const res = await fetch("/api/admin/leave-types");
      const data = await res.json();
      if (data?.success && Array.isArray(data.leaveTypes)) {
        setLeaveTypes(data.leaveTypes);
      }
    } catch (err) {
      console.error("Error loading leave types:", err);
    }
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/admin/leave-types").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/hr/leave-policy").then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([settingsData, typesData, leaveData]) => {
        if (settingsData?.success) {
          if (settingsData.currentClientIp) setDetectedIp(settingsData.currentClientIp);
          if (settingsData.profile?.name) setCompanyName(settingsData.profile.name);
          if (settingsData.schedule) {
            setStartTime(settingsData.schedule.startTime || "09:00");
            setEndTime(settingsData.schedule.endTime || "18:00");
            setLateCutoffTime(settingsData.schedule.lateCutoffTime || "09:15");
            setGraceMinutes(settingsData.schedule.graceMinutes ?? 15);
            setHalfDayHours(settingsData.schedule.halfDayHours ?? 4);
            if (settingsData.schedule.workingDays) setDays(settingsData.schedule.workingDays);
          }
          if (settingsData.network) {
            setWifi(Boolean(settingsData.network.enforceOfficeIp));
            setWfh({
              enabled: true,
              sameDay: Boolean(settingsData.network.allowSameDayWfh),
              limit: settingsData.network.wfhLimitMonthly ?? 4,
            });
            if (Array.isArray(settingsData.network.allowedIps)) {
              setNets(settingsData.network.allowedIps);
            }
          }
        }

        if (typesData?.success && Array.isArray(typesData.leaveTypes)) {
          setLeaveTypes(typesData.leaveTypes);
        }

        if (leaveData?.success && leaveData.policy) {
          setWorkingDays(Number(leaveData.policy.workingDays ?? 22));
        }
      })
      .catch((err) => console.error("Error loading settings:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    // Auto-sync late cutoff time based on start time + grace minutes
    const parts = val.split(":");
    if (parts.length === 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) {
        const totalMin = h * 60 + m + graceMinutes;
        const newH = Math.floor(totalMin / 60) % 24;
        const newM = totalMin % 60;
        setLateCutoffTime(`${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`);
      }
    }
  };

  const handleGraceMinutesChange = (val: number) => {
    setGraceMinutes(val);
    const parts = startTime.split(":");
    if (parts.length === 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) {
        const totalMin = h * 60 + m + val;
        const newH = Math.floor(totalMin / 60) % 24;
        const newM = totalMin % 60;
        setLateCutoffTime(`${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`);
      }
    }
  };

  const save = async (customNets?: Net[], customWifi?: boolean, customWfh?: typeof wfh) => {
    if (saving) return;
    setSaving(true);
    const targetNets = customNets ?? nets;
    const targetWifi = customWifi ?? wifi;
    const targetWfh = customWfh ?? wfh;

    try {
      // 1. Save general settings, schedule, network
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyName.trim(),
          schedule: {
            startTime,
            endTime,
            lateCutoffTime,
            graceMinutes,
            halfDayHours,
            workingDays: days,
          },
          network: {
            enforceOfficeIp: targetWifi,
            allowSameDayWfh: targetWfh.sameDay,
            wfhLimitMonthly: targetWfh.limit,
            allowedIps: targetNets,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");

      // 2. Save leave policy with working days
      const leaveRes = await fetch("/api/hr/leave-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workingDays,
        }),
      });
      const leaveData = await leaveRes.json();
      if (!leaveRes.ok) throw new Error(leaveData.error || "Failed to update leave policy");

      toast("Settings saved to database");
    } catch (err: any) {
      toast(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCurrentIp = async () => {
    if (!detectedIp) return;
    if (nets.some((n) => n.ip === detectedIp)) {
      toast(`IP ${detectedIp} is already in the allowed list`);
      return;
    }
    const updated = [
      ...nets,
      { id: `net_${Date.now()}`, label: "Current Office WiFi", ip: detectedIp, active: true },
    ];
    setNets(updated);
    toast(`Saving ${detectedIp} to office networks...`);
    await save(updated);
  };

  const addNetwork = async () => {
    if (!newNet.label.trim() || !newNet.ip.trim()) {
      toast("Please enter both network label and IP address");
      return;
    }
    const updated = [
      ...nets,
      { id: `net_${Date.now()}`, label: newNet.label.trim(), ip: newNet.ip.trim(), active: true },
    ];
    setNets(updated);
    setNewNet({ label: "", ip: "" });
    toast(`Saving ${newNet.ip.trim()}...`);
    await save(updated);
  };

  const removeNet = async (id: string) => {
    const updated = nets.filter((n) => n.id !== id);
    setNets(updated);
    await save(updated);
  };

  const toggleNetActive = async (id: string, active: boolean) => {
    const updated = nets.map((n) => (n.id === id ? { ...n, active } : n));
    setNets(updated);
    await save(updated);
  };

  const getCycleMonths = (preset: string, custom: number, cat: string) => {
    if (cat === "unpaid") return 1;
    if (preset === "custom") return Math.max(1, Math.min(12, Number(custom) || 1));
    return Number(preset) || 1;
  };

  const handleCreateLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeForm.name.trim()) return toast("Leave type name is required");
    if (!typeForm.code.trim()) return toast("Leave type code is required");

    setSaving(true);
    try {
      const cycleMonths = getCycleMonths(typeForm.cyclePreset, typeForm.customMonths, typeForm.category);
      const quota = typeForm.category === "unpaid" ? 0 : Number(typeForm.quotaPerCycle) || 0;

      const res = await fetch("/api/admin/leave-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: typeForm.name.trim(),
          code: typeForm.code.trim().toUpperCase(),
          description: typeForm.description.trim(),
          category: typeForm.category,
          cycleMonths,
          quotaPerCycle: quota,
          carryForward: typeForm.carryForward,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create leave type");

      toast(json.message || "Leave type created");
      setAddingType(false);
      setTypeForm({
        name: "",
        code: "",
        description: "",
        category: "paid",
        cyclePreset: "4",
        customMonths: 4,
        quotaPerCycle: 2.0,
        carryForward: true,
      });
      await fetchLeaveTypes();
    } catch (err: any) {
      toast(err.message || "Creation failed");
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (lt: LeaveType) => {
    setEditingType(lt);
    const isStandard = [1, 3, 4, 6, 12].includes(lt.cycleMonths);
    setTypeForm({
      name: lt.name,
      code: lt.code,
      description: lt.description || "",
      category: lt.category,
      cyclePreset: isStandard ? String(lt.cycleMonths) : "custom",
      customMonths: lt.cycleMonths,
      quotaPerCycle: lt.quotaPerCycle,
      carryForward: lt.carryForward,
    });
  };

  const handleUpdateLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType) return;
    if (!typeForm.name.trim()) return toast("Leave type name is required");
    if (!typeForm.code.trim()) return toast("Leave type code is required");

    setSaving(true);
    try {
      const cycleMonths = getCycleMonths(typeForm.cyclePreset, typeForm.customMonths, typeForm.category);
      const quota = typeForm.category === "unpaid" ? 0 : Number(typeForm.quotaPerCycle) || 0;

      const res = await fetch("/api/admin/leave-types", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingType.id,
          name: typeForm.name.trim(),
          code: typeForm.code.trim().toUpperCase(),
          description: typeForm.description.trim(),
          category: typeForm.category,
          cycleMonths: typeForm.category === "unpaid" ? 1 : cycleMonths,
          quotaPerCycle: quota,
          carryForward: typeForm.carryForward,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update leave type");

      toast("Leave type updated");
      setEditingType(null);
      await fetchLeaveTypes();
    } catch (err: any) {
      toast(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleLeaveTypeActive = async (lt: LeaveType) => {
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
      if (!res.ok) throw new Error(json.error || "Action failed");

      toast(`"${lt.name}" is now ${!lt.isActive ? "active" : "inactive"}`);
      await fetchLeaveTypes();
    } catch (err: any) {
      toast(err.message || "Action failed");
    }
  };

  const deleteLeaveType = async (lt: LeaveType) => {
    if (!confirm(`Are you sure you want to remove or deactivate "${lt.name}" (${lt.code})?`)) return;
    try {
      const res = await fetch(`/api/admin/leave-types?id=${lt.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");

      toast(json.message || "Leave type removed");
      await fetchLeaveTypes();
    } catch (err: any) {
      toast(err.message || "Delete failed");
    }
  };

  const modalCycleMonths = getCycleMonths(typeForm.cyclePreset, typeForm.customMonths, typeForm.category);
  const modalAnnualTotal =
    typeForm.category === "unpaid"
      ? 0
      : Math.round((12 / modalCycleMonths) * (Number(typeForm.quotaPerCycle) || 0) * 10) / 10;

  return (
    <>
      <PageHeader
        title="Company settings"
        desc="Work hours, office schedule, late mark cutoff, and monthly carry forward leave policies."
        actions={
          <Btn onClick={() => save()} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Btn>
        }
      />
      <Tabs
        tabs={[
          { id: "hours", label: "Work hours & late rule" },
          { id: "leaves", label: "Leave policy & carry forward" },
          { id: "network", label: "Network and WFH" },
          { id: "company", label: "Company profile" },
        ]}
        value={tab}
        onChange={setTab as any}
      />

      {loading ? (
        <SectionLoader message="Loading settings from database..." />
      ) : (
        <>
          {/* TAB 1: WORK HOURS & LATE MARK RULE */}
          {tab === "hours" && (
            <Card className="max-w-2xl">
              <CardHeader
                title="Office work schedule & late mark rule"
                desc="Admin sets the office shift timings, working days, and exact late mark cutoff time."
              />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Shift start time">
                  <input
                    type="time"
                    className={inputCls}
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                  />
                </Field>
                <Field label="Shift end time">
                  <input
                    type="time"
                    className={inputCls}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </Field>

                <Field
                  label="Late mark cutoff time"
                  hint="Check-ins after this exact time will be marked as Late."
                >
                  <input
                    type="time"
                    className={inputCls}
                    value={lateCutoffTime}
                    onChange={(e) => setLateCutoffTime(e.target.value)}
                  />
                </Field>

                <Field
                  label="Grace time (minutes)"
                  hint="Grace minutes added to shift start time."
                >
                  <input
                    type="number"
                    className={inputCls}
                    value={graceMinutes}
                    onChange={(e) => handleGraceMinutesChange(Number(e.target.value))}
                  />
                </Field>

                {/* Late Mark Rule Visual Banner */}
                <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-semibold text-amber-900">
                        Late Mark Rule Active: Shift {startTime} – {endTime}
                      </p>
                      <p className="mt-1 text-amber-800">
                        Employees checking in after <b>{lateCutoffTime}</b> (e.g. at{" "}
                        {lateCutoffTime ? `${lateCutoffTime.slice(0, 3)}${String(Number(lateCutoffTime.slice(3)) + 1).padStart(2, "0")}` : "09:16"}) will automatically have a <b>Late Mark</b> recorded on their attendance.
                      </p>
                    </div>
                  </div>
                </div>

                <Field label="Half-day threshold (hours)">
                  <input
                    type="number"
                    className={inputCls}
                    value={halfDayHours}
                    onChange={(e) => setHalfDayHours(Number(e.target.value))}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <p className="mb-2 text-sm font-medium text-slate-700">Office working days</p>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_SHORT.map((d, i) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() =>
                          setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i])
                        }
                        className={cn(
                          "h-10 w-12 rounded-lg border text-sm font-medium transition cursor-pointer",
                          days.includes(i)
                            ? "border-pine bg-pine-soft font-semibold text-pine"
                            : "border-slate-300 text-slate-500 hover:bg-slate-50"
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    Selected: {days.map((d) => DAYS_SHORT[d]).join(", ")} ({days.length} days/week)
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 2: LEAVE TYPES & ACCRUAL POLICY */}
          {tab === "leaves" && (
            <div className="grid gap-6 max-w-3xl">
              <Card>
                <CardHeader
                  title="Leave types & accrual"
                  desc="Configure leave types, accrual cycle frequencies, and carry-forward rules."
                  action={
                    <Btn
                      size="sm"
                      icon={Plus}
                      onClick={() => {
                        setTypeForm({
                          name: "",
                          code: "",
                          description: "",
                          category: "paid",
                          cyclePreset: "4",
                          customMonths: 4,
                          quotaPerCycle: 2.0,
                          carryForward: true,
                        });
                        setAddingType(true);
                      }}
                    >
                      Add leave type
                    </Btn>
                  }
                />

                <div className="divide-y divide-slate-100">
                  {leaveTypes.map((lt) => {
                    const isPaid = lt.category === "paid";
                    const cycleLabel =
                      lt.cycleMonths === 1
                        ? "Monthly"
                        : lt.cycleMonths === 3
                        ? "Quarterly (3 mo)"
                        : lt.cycleMonths === 4
                        ? "4-Month Quarter"
                        : lt.cycleMonths === 6
                        ? "Half-Yearly (6 mo)"
                        : lt.cycleMonths === 12
                        ? "Annual (12 mo)"
                        : `${lt.cycleMonths}-Month Cycle`;

                    return (
                      <div
                        key={lt.id}
                        className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 transition hover:bg-slate-50/60"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-sm">{lt.name}</span>
                            <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {lt.code}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {isPaid ? "Paid" : "Unpaid"}
                            </span>
                            {!lt.isActive && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                Inactive
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            {isPaid ? (
                              <>
                                <span>
                                  <b>{lt.quotaPerCycle} days</b> / {cycleLabel.toLowerCase()}
                                </span>
                                <span>·</span>
                                <span>
                                  <b>{lt.annualTotal} days</b> / year
                                </span>
                                <span>·</span>
                                <span>{lt.carryForward ? "Carry forward active" : "Resets per cycle"}</span>
                              </>
                            ) : (
                              <span>No quota limit · Deducted from payroll</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleLeaveTypeActive(lt)}
                            className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
                              lt.isActive
                                ? "text-slate-600 hover:bg-slate-100"
                                : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                            }`}
                          >
                            {lt.isActive ? "Deactivate" : "Activate"}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(lt)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
                            title="Edit leave type"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteLeaveType(lt)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                            title="Delete leave type"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {leaveTypes.length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No leave types configured. Click &quot;Add leave type&quot; above to create one.
                    </div>
                  )}
                </div>
              </Card>

              {/* Payroll Standard Working Days Card */}
              <Card>
                <CardHeader
                  title="Payroll calculation standard"
                  desc="Standard monthly working days used to calculate per-day salary deduction for unpaid leaves."
                />
                <div className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <label className="label mb-1 block font-medium text-slate-700">
                      Standard working days / month
                    </label>
                    <span className="text-xs text-slate-400">
                      Daily salary rate = Monthly CTC / {workingDays} days
                    </span>
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      min={15}
                      max={31}
                      className={inputCls}
                      value={workingDays}
                      onChange={(e) => setWorkingDays(Number(e.target.value))}
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: NETWORK AND WFH */}
          {tab === "network" && (
            <div className="grid gap-6 max-w-3xl">
              <Card>
                <CardHeader
                  title="Office network check-in verification"
                  desc="Ensure employees check in from designated corporate office networks. When active, check-in is locked to approved IPs unless employee has an approved WFH day."
                />
                <div className="p-5 border-b border-slate-100">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wifi}
                      onChange={(e) => setWifi(e.target.checked)}
                      className="h-4 w-4 accent-pine rounded"
                    />
                    <span className="text-sm font-medium text-slate-800">
                      Enforce office WiFi verification for employee presenty (check-in)
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-mute ml-7">
                    Approved Work From Home (WFH) days automatically bypass this restriction.
                  </p>
                </div>

                {/* Detected IP Quick-Add Box */}
                <div className="p-5 border-b border-line bg-pine-soft/40 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-pine block">
                      Current Detected Network IP
                    </span>
                    <span className="text-sm font-mono font-medium text-slate-900 mt-0.5 block">
                      {detectedIp}
                    </span>
                  </div>
                  <Btn
                    size="sm"
                    variant="outline"
                    icon={Plus}
                    disabled={saving}
                    onClick={handleAddCurrentIp}
                  >
                    Add my current IP as Office WiFi
                  </Btn>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Whitelisted Office Networks ({nets.length})
                    </p>
                  </div>

                  <div className="space-y-2 mb-4">
                    {nets.length === 0 ? (
                      <p className="py-4 text-center text-xs text-slate-400 border border-dashed rounded-lg">
                        No networks added yet. Click above to add your current WiFi.
                      </p>
                    ) : (
                      nets.map((net) => (
                        <div
                          key={net.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-line bg-white shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <Wifi className="h-4 w-4 text-pine" />
                            <div>
                              <p className="text-xs font-medium text-slate-800">{net.label}</p>
                              <p className="text-[11px] font-mono text-slate-400">{net.ip}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={net.active}
                                onChange={(e) => toggleNetActive(net.id, e.target.checked)}
                                className="h-3.5 w-3.5 accent-pine"
                              />
                              <span>Active</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => removeNet(net.id)}
                              disabled={saving}
                              className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Delete network"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 pt-2">
                    <input
                      className={inputCls}
                      placeholder="Network label (e.g. Pune Office Router)"
                      value={newNet.label}
                      onChange={(e) => setNewNet({ ...newNet, label: e.target.value })}
                    />
                    <input
                      className={inputCls}
                      placeholder="IP (e.g. 203.0.113.10)"
                      value={newNet.ip}
                      onChange={(e) => setNewNet({ ...newNet, ip: e.target.value })}
                    />
                    <Btn type="button" icon={saving ? Loader2 : Plus} disabled={saving} onClick={addNetwork}>
                      Add IP
                    </Btn>
                  </div>

                  <div className="flex justify-end pt-5 mt-4 border-t border-line">
                    <Btn onClick={() => save()} disabled={saving} icon={saving ? Loader2 : undefined}>
                      {saving ? "Saving settings..." : "Save network settings"}
                    </Btn>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Work From Home (WFH) policy" />
                <div className="p-5 space-y-4">
                  <Field label="Monthly WFH allocation per employee (days)">
                    <input
                      type="number"
                      className={inputCls}
                      value={wfh.limit}
                      onChange={(e) => setWfh({ ...wfh, limit: Number(e.target.value) })}
                    />
                  </Field>
                  <label className="flex items-center gap-2.5 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={wfh.sameDay}
                      onChange={(e) => setWfh({ ...wfh, sameDay: e.target.checked })}
                      className="h-4 w-4 accent-pine"
                    />
                    <span>Allow employees to submit same-day WFH requests</span>
                  </label>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 4: COMPANY PROFILE */}
          {tab === "company" && (
            <Card className="max-w-2xl">
              <CardHeader title="Company profile" desc="Basic details for your company workspace." />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Company name">
                    <input
                      className={inputCls}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Timezone">
                  <select
                    className={inputCls}
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                  </select>
                </Field>
                <Field label="Currency">
                  <input className={inputCls} defaultValue="INR (₹)" readOnly />
                </Field>
              </div>
            </Card>
          )}
        </>
      )}
      {/* ADD LEAVE TYPE MODAL */}
      <Modal
        open={addingType}
        onClose={() => setAddingType(false)}
        title="Add leave type"
        desc="Create a leave type with accrual frequency and quota."
        footer={
          <>
            <Btn variant="outline" onClick={() => setAddingType(false)}>
              Cancel
            </Btn>
            <Btn type="submit" form="add-leave-form" disabled={saving}>
              {saving ? "Creating..." : "Create leave type"}
            </Btn>
          </>
        }
      >
        <form id="add-leave-form" className="space-y-4" onSubmit={handleCreateLeaveType}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name" hint="e.g. Sick Leave, Casual Leave">
              <input
                type="text"
                required
                placeholder="Sick Leave"
                className={inputCls}
                value={typeForm.name}
                onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              />
            </Field>

            <Field label="Code" hint="e.g. SL, CL, LWP">
              <input
                type="text"
                required
                maxLength={8}
                placeholder="SL"
                className={`${inputCls} uppercase font-mono`}
                value={typeForm.code}
                onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value.toUpperCase() })}
              />
            </Field>
          </div>

          <Field label="Category">
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer text-xs transition ${
                  typeForm.category === "paid"
                    ? "border-emerald-500 bg-emerald-50/60 font-semibold text-emerald-950"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="modal_cat"
                  className="accent-emerald-600"
                  checked={typeForm.category === "paid"}
                  onChange={() => setTypeForm({ ...typeForm, category: "paid" })}
                />
                <div>
                  <span className="block font-semibold">Paid leave</span>
                  <span className="text-[11px] text-slate-500 font-normal">Accrues quota per cycle</span>
                </div>
              </label>

              <label
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer text-xs transition ${
                  typeForm.category === "unpaid"
                    ? "border-amber-500 bg-amber-50/60 font-semibold text-amber-950"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="modal_cat"
                  className="accent-amber-600"
                  checked={typeForm.category === "unpaid"}
                  onChange={() => setTypeForm({ ...typeForm, category: "unpaid" })}
                />
                <div>
                  <span className="block font-semibold">Unpaid (LWP)</span>
                  <span className="text-[11px] text-slate-500 font-normal">Salary deducted</span>
                </div>
              </label>
            </div>
          </Field>

          {typeForm.category === "paid" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Cycle frequency" hint="Accrual interval">
                  <select
                    className={inputCls}
                    value={typeForm.cyclePreset}
                    onChange={(e) => setTypeForm({ ...typeForm, cyclePreset: e.target.value })}
                  >
                    <option value="1">Monthly (1 month)</option>
                    <option value="3">Quarterly (3 months)</option>
                    <option value="4">4-Month Quarter (4 months)</option>
                    <option value="6">Half-Yearly (6 months)</option>
                    <option value="12">Annual (12 months)</option>
                    <option value="custom">Custom cycle...</option>
                  </select>
                </Field>

                {typeForm.cyclePreset === "custom" ? (
                  <Field label="Cycle length (months)">
                    <input
                      type="number"
                      min={1}
                      max={12}
                      className={inputCls}
                      value={typeForm.customMonths}
                      onChange={(e) => setTypeForm({ ...typeForm, customMonths: Number(e.target.value) })}
                    />
                  </Field>
                ) : (
                  <Field label="Quota per cycle (days)" hint="e.g. 2.0 or 1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="50"
                      className={inputCls}
                      value={typeForm.quotaPerCycle}
                      onChange={(e) => setTypeForm({ ...typeForm, quotaPerCycle: Number(e.target.value) })}
                    />
                  </Field>
                )}
              </div>

              {typeForm.cyclePreset === "custom" && (
                <Field label="Quota per cycle (days)" hint="e.g. 2.0 or 1.5">
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="50"
                    className={inputCls}
                    value={typeForm.quotaPerCycle}
                    onChange={(e) => setTypeForm({ ...typeForm, quotaPerCycle: Number(e.target.value) })}
                  />
                </Field>
              )}

              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900 font-mono">
                {typeForm.quotaPerCycle} days every {modalCycleMonths} month(s) = {modalAnnualTotal} days / year
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-pine"
                    checked={typeForm.carryForward}
                    onChange={(e) => setTypeForm({ ...typeForm, carryForward: e.target.checked })}
                  />
                  <span>Carry forward unused leaves to next cycle</span>
                </label>
              </div>
            </>
          )}

          <Field label="Description (optional)">
            <input
              type="text"
              className={inputCls}
              placeholder="e.g. 2 days per 4-month cycle"
              value={typeForm.description}
              onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
            />
          </Field>
        </form>
      </Modal>

      {/* EDIT LEAVE TYPE MODAL */}
      <Modal
        open={!!editingType}
        onClose={() => setEditingType(null)}
        title={`Edit ${editingType?.name || "leave type"}`}
        desc="Update quota, accrual cycle, or details."
        footer={
          <>
            <Btn variant="outline" onClick={() => setEditingType(null)}>
              Cancel
            </Btn>
            <Btn type="submit" form="edit-leave-form" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Btn>
          </>
        }
      >
        <form id="edit-leave-form" className="space-y-4" onSubmit={handleUpdateLeaveType}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name">
              <input
                type="text"
                required
                className={inputCls}
                value={typeForm.name}
                onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              />
            </Field>

            <Field label="Code">
              <input
                type="text"
                required
                maxLength={8}
                className={`${inputCls} uppercase font-mono`}
                value={typeForm.code}
                onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value.toUpperCase() })}
              />
            </Field>
          </div>

          <Field label="Category">
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer text-xs transition ${
                  typeForm.category === "paid"
                    ? "border-emerald-500 bg-emerald-50/60 font-semibold text-emerald-950"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="edit_modal_cat"
                  className="accent-emerald-600"
                  checked={typeForm.category === "paid"}
                  onChange={() => setTypeForm({ ...typeForm, category: "paid" })}
                />
                <span>Paid leave</span>
              </label>

              <label
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer text-xs transition ${
                  typeForm.category === "unpaid"
                    ? "border-amber-500 bg-amber-50/60 font-semibold text-amber-950"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="edit_modal_cat"
                  className="accent-amber-600"
                  checked={typeForm.category === "unpaid"}
                  onChange={() => setTypeForm({ ...typeForm, category: "unpaid" })}
                />
                <span>Unpaid (LWP)</span>
              </label>
            </div>
          </Field>

          {typeForm.category === "paid" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Cycle frequency">
                  <select
                    className={inputCls}
                    value={typeForm.cyclePreset}
                    onChange={(e) => setTypeForm({ ...typeForm, cyclePreset: e.target.value })}
                  >
                    <option value="1">Monthly (1 month)</option>
                    <option value="3">Quarterly (3 months)</option>
                    <option value="4">4-Month Quarter (4 months)</option>
                    <option value="6">Half-Yearly (6 months)</option>
                    <option value="12">Annual (12 months)</option>
                    <option value="custom">Custom cycle...</option>
                  </select>
                </Field>

                {typeForm.cyclePreset === "custom" ? (
                  <Field label="Cycle length (months)">
                    <input
                      type="number"
                      min={1}
                      max={12}
                      className={inputCls}
                      value={typeForm.customMonths}
                      onChange={(e) => setTypeForm({ ...typeForm, customMonths: Number(e.target.value) })}
                    />
                  </Field>
                ) : (
                  <Field label="Quota per cycle (days)">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="50"
                      className={inputCls}
                      value={typeForm.quotaPerCycle}
                      onChange={(e) => setTypeForm({ ...typeForm, quotaPerCycle: Number(e.target.value) })}
                    />
                  </Field>
                )}
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900 font-mono">
                {typeForm.quotaPerCycle} days every {modalCycleMonths} month(s) = {modalAnnualTotal} days / year
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-pine"
                    checked={typeForm.carryForward}
                    onChange={(e) => setTypeForm({ ...typeForm, carryForward: e.target.checked })}
                  />
                  <span>Carry forward unused leaves to next cycle</span>
                </label>
              </div>
            </>
          )}

          <Field label="Description (optional)">
            <input
              type="text"
              className={inputCls}
              value={typeForm.description}
              onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
            />
          </Field>
        </form>
      </Modal>
    </>
  );
}
