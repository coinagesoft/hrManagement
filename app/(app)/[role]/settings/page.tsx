"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Wifi, Loader2, Clock, Calendar, ShieldCheck, AlertCircle } from "lucide-react";
import { Btn, Card, CardHeader, PageHeader, Table, Td, Th } from "@/components/ui";
import { Field, Tabs, inputCls, useToast } from "@/components/interactive";
import { DAYS_SHORT } from "@/lib/dates";
import { cn } from "@/lib/cn";

type Net = { id: string; label: string; ip: string; active: boolean };

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

  // Leave policy states (Monthly accrual & Carry forward)
  const [casualPerMonth, setCasualPerMonth] = useState(1.5);
  const [sickPerMonth, setSickPerMonth] = useState(1.0);
  const [carryForwardEnabled, setCarryForwardEnabled] = useState(true);

  const [wifi, setWifi] = useState(true);
  const [wfh, setWfh] = useState({ enabled: true, sameDay: true, limit: 4 });
  const [nets, setNets] = useState<Net[]>([]);
  const [detectedIp, setDetectedIp] = useState("127.0.0.1");
  const [newNet, setNewNet] = useState({ label: "", ip: "" });

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/hr/leave-policy").then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([settingsData, leaveData]) => {
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

        if (leaveData?.success && leaveData.policy) {
          setCasualPerMonth(Number(leaveData.policy.casual ?? 1.5));
          setSickPerMonth(Number(leaveData.policy.sick ?? 1.0));
          setCarryForwardEnabled(Boolean(leaveData.policy.carryForwardEnabled ?? true));
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

      // 2. Save leave policy with monthly accrual and carry forward
      const leaveRes = await fetch("/api/hr/leave-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          casual: casualPerMonth,
          sick: sickPerMonth,
          carryForwardEnabled,
        }),
      });
      const leaveData = await leaveRes.json();
      if (!leaveRes.ok) throw new Error(leaveData.error || "Failed to update leave policy");

      toast("Settings & leave policy saved to database");
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
        <div className="flex items-center justify-center p-12 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading settings from database...
        </div>
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

          {/* TAB 2: LEAVE POLICY & CARRY FORWARD */}
          {tab === "leaves" && (
            <div className="grid gap-6 max-w-2xl">
              <Card>
                <CardHeader
                  title="Monthly leave accrual & carry forward policy"
                  desc="Configure monthly leave credit rates and enable unused leave carry forward."
                />
                <div className="p-5 space-y-4 text-xs">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label mb-1 block font-medium text-slate-700">
                        Casual Leave (CL) accrual per month (days)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="5"
                        className={inputCls}
                        value={casualPerMonth}
                        onChange={(e) => setCasualPerMonth(Number(e.target.value))}
                      />
                      <span className="mt-1 block text-[11px] text-slate-400">
                        E.g. 1.5 days added to employee balance every month
                      </span>
                    </div>

                    <div>
                      <label className="label mb-1 block font-medium text-slate-700">
                        Sick Leave (SL) accrual per month (days)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="5"
                        className={inputCls}
                        value={sickPerMonth}
                        onChange={(e) => setSickPerMonth(Number(e.target.value))}
                      />
                      <span className="mt-1 block text-[11px] text-slate-400">
                        E.g. 1.0 day added to employee balance every month
                      </span>
                    </div>
                  </div>

                  {/* Carry Forward Toggle */}
                  <div className="pt-3 border-t border-slate-100">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={carryForwardEnabled}
                        onChange={(e) => setCarryForwardEnabled(e.target.checked)}
                        className="h-4 w-4 accent-pine rounded"
                      />
                      <div>
                        <span className="text-sm font-semibold text-slate-900 block">
                          Carry forward unused monthly leaves to the next month (Unlimited)
                        </span>
                        <span className="text-xs text-slate-500 block mt-0.5">
                          When checked, untaken leaves will accumulate automatically each month without any limit.
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Live Simulation / Example Card */}
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 mt-4">
                    <h5 className="font-semibold text-blue-900 text-xs mb-1">
                      💡 How Carry Forward Works for Your Employees:
                    </h5>
                    <ul className="space-y-1 text-blue-800 text-xs list-disc list-inside">
                      <li>
                        <b>Month 1:</b> Employee receives <b>{casualPerMonth} days</b> CL. If 0 leaves taken, balance carried forward = <b>{casualPerMonth} days</b>.
                      </li>
                      <li>
                        <b>Month 2:</b> Employee receives <b>+{casualPerMonth} days</b> this month. Available balance ={" "}
                        <b>{casualPerMonth} + {casualPerMonth} = {(casualPerMonth * 2).toFixed(1)} days</b>!
                      </li>
                      <li>
                        <b>Month 3:</b> If employee used 1 day in Month 2, available balance ={" "}
                        <b>{(casualPerMonth * 2 - 1).toFixed(1)} + {casualPerMonth} = {(casualPerMonth * 3 - 1).toFixed(1)} days</b>.
                      </li>
                    </ul>
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
    </>
  );
}
