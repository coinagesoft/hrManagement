"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Wifi, Loader2 } from "lucide-react";
import { Btn, Card, CardHeader, PageHeader, Table, Td, Th } from "@/components/ui";
import { Field, Tabs, inputCls, useToast } from "@/components/interactive";
import { DAYS_SHORT } from "@/lib/dates";
import { cn } from "@/lib/cn";

type Net = { id: string; label: string; ip: string; active: boolean };

export default function SettingsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"company" | "hours" | "network">("company");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [companyName, setCompanyName] = useState("Acme Technologies Pvt Ltd");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [startTime, setStartTime] = useState("09:30");
  const [endTime, setEndTime] = useState("18:30");
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [halfDayHours, setHalfDayHours] = useState(4);
  const [days, setDays] = useState([1, 2, 3, 4, 5]);

  const [wifi, setWifi] = useState(true);
  const [wfh, setWfh] = useState({ enabled: true, sameDay: true, limit: 4 });
  const [nets, setNets] = useState<Net[]>([]);
  const [detectedIp, setDetectedIp] = useState("127.0.0.1");
  const [newNet, setNewNet] = useState({ label: "", ip: "" });

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) {
          if (data.currentClientIp) setDetectedIp(data.currentClientIp);
          if (data.profile?.name) setCompanyName(data.profile.name);
          if (data.schedule) {
            setStartTime(data.schedule.startTime || "09:30");
            setEndTime(data.schedule.endTime || "18:30");
            setGraceMinutes(data.schedule.graceMinutes ?? 15);
            setHalfDayHours(data.schedule.halfDayHours ?? 4);
            if (data.schedule.workingDays) setDays(data.schedule.workingDays);
          }
          if (data.network) {
            setWifi(Boolean(data.network.enforceOfficeIp));
            setWfh({
              enabled: true,
              sameDay: Boolean(data.network.allowSameDayWfh),
              limit: data.network.wfhLimitMonthly ?? 4,
            });
            if (Array.isArray(data.network.allowedIps)) {
              setNets(data.network.allowedIps);
            }
          }
        }
      })
      .catch((err) => console.error("Error loading settings:", err))
      .finally(() => setLoading(false));
  }, []);

  const save = async (customNets?: Net[], customWifi?: boolean, customWfh?: typeof wfh) => {
    if (saving) return;
    setSaving(true);
    const targetNets = customNets ?? nets;
    const targetWifi = customWifi ?? wifi;
    const targetWfh = customWfh ?? wfh;

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyName.trim(),
          schedule: {
            startTime,
            endTime,
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

  return (
    <>
      <PageHeader
        title="Company settings"
        desc="Work hours, office network policies, and attendance rules."
        actions={
          <Btn onClick={() => save()} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Btn>
        }
      />
      <Tabs
        tabs={[
          { id: "company", label: "Company" },
          { id: "hours", label: "Work hours" },
          { id: "network", label: "Network and WFH" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading settings from database...
        </div>
      ) : (
        <>
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

          {tab === "hours" && (
            <Card className="max-w-2xl">
              <CardHeader
                title="Work schedule"
                desc="Used for late attendance marking, worked hours, and salary runs."
              />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Start time">
                  <input
                    type="time"
                    className={inputCls}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </Field>
                <Field label="End time">
                  <input
                    type="time"
                    className={inputCls}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </Field>
                <Field
                  label="Grace time (minutes)"
                  hint="Check-ins within this grace period are not marked late."
                >
                  <input
                    type="number"
                    className={inputCls}
                    value={graceMinutes}
                    onChange={(e) => setGraceMinutes(Number(e.target.value))}
                  />
                </Field>
                <Field label="Half-day threshold (hours)">
                  <input
                    type="number"
                    className={inputCls}
                    value={halfDayHours}
                    onChange={(e) => setHalfDayHours(Number(e.target.value))}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <p className="mb-2 text-sm font-medium text-slate-700">Working days of the week</p>
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
                </div>
              </div>
            </Card>
          )}

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
                      Allowed Office WiFi / Network IPs ({nets.length})
                    </p>
                  </div>
                  <div className="space-y-2 mb-4">
                    {nets.length === 0 ? (
                      <p className="text-xs text-mute py-4 text-center border border-dashed border-line rounded-lg">
                        No networks configured yet. Add your current IP or enter an office IP below.
                      </p>
                    ) : (
                      nets.map((net) => (
                        <div
                          key={net.id}
                          className="flex items-center justify-between border border-line rounded-lg p-3 bg-canvas"
                        >
                          <div className="flex items-center gap-2.5">
                            <Wifi className={cn("h-4 w-4", net.active !== false ? "text-pine" : "text-slate-300")} />
                            <div>
                              <span className={cn("text-sm font-medium block", net.active !== false ? "text-slate-900" : "text-slate-400 line-through")}>
                                {net.label}
                              </span>
                              <span className="text-xs font-mono text-slate-500">{net.ip}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={net.active !== false}
                                disabled={saving}
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
        </>
      )}
    </>
  );
}
