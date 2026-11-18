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
  const [nets, setNets] = useState<Net[]>([
    { id: "n1", label: "Pune Head Office", ip: "203.0.113.10", active: true },
  ]);
  const [newNet, setNewNet] = useState({ label: "", ip: "" });

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) {
          if (data.profile?.name) setCompanyName(data.profile.name);
          if (data.schedule) {
            setStartTime(data.schedule.startTime || "09:30");
            setEndTime(data.schedule.endTime || "18:30");
            setGraceMinutes(data.schedule.graceMinutes ?? 15);
            setHalfDayHours(data.schedule.halfDayHours ?? 4);
            if (data.schedule.workingDays) setDays(data.schedule.workingDays);
          }
          if (data.network) {
            setWifi(data.network.enforceOfficeIp);
            setWfh({
              enabled: true,
              sameDay: data.network.allowSameDayWfh,
              limit: data.network.wfhLimitMonthly ?? 4,
            });
            if (data.network.allowedIps?.length) setNets(data.network.allowedIps);
          }
        }
      })
      .catch((err) => console.error("Error loading settings:", err))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (saving) return;
    setSaving(true);
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
            enforceOfficeIp: wifi,
            allowSameDayWfh: wfh.sameDay,
            wfhLimitMonthly: wfh.limit,
            allowedIps: nets,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");

      toast("Company settings saved to MySQL database");
    } catch (err: any) {
      toast(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const addNetwork = () => {
    if (!newNet.label || !newNet.ip) return;
    setNets([...nets, { id: `net_${Date.now()}`, label: newNet.label, ip: newNet.ip, active: true }]);
    setNewNet({ label: "", ip: "" });
  };

  const removeNet = (id: string) => {
    setNets(nets.filter((n) => n.id !== id));
  };

  return (
    <>
      <PageHeader
        title="Company settings"
        desc="Work hours, office network policies, and attendance rules."
        actions={
          <Btn onClick={save} disabled={saving}>
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
                  desc="Ensure employees check in from designated corporate office networks."
                />
                <div className="p-5 border-b border-slate-100">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wifi}
                      onChange={(e) => setWifi(e.target.checked)}
                      className="h-4 w-4 accent-pine"
                    />
                    <span className="text-sm font-medium text-slate-800">
                      Enforce office network verification for check-ins (Approved WFH days skip this check)
                    </span>
                  </label>
                </div>

                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    Allowed Office IP Addresses
                  </p>
                  <div className="space-y-2 mb-4">
                    {nets.map((net) => (
                      <div
                        key={net.id}
                        className="flex items-center justify-between border border-line rounded-lg p-3 bg-canvas"
                      >
                        <div className="flex items-center gap-2.5">
                          <Wifi className="h-4 w-4 text-pine" />
                          <div>
                            <span className="text-sm font-medium text-slate-900 block">{net.label}</span>
                            <span className="text-xs font-mono text-slate-500">{net.ip}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNet(net.id)}
                          className="text-slate-400 hover:text-rose-600 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 pt-2">
                    <input
                      className={inputCls}
                      placeholder="Network label (e.g. Pune Office)"
                      value={newNet.label}
                      onChange={(e) => setNewNet({ ...newNet, label: e.target.value })}
                    />
                    <input
                      className={inputCls}
                      placeholder="IP (e.g. 203.0.113.10)"
                      value={newNet.ip}
                      onChange={(e) => setNewNet({ ...newNet, ip: e.target.value })}
                    />
                    <Btn type="button" icon={Plus} onClick={addNetwork}>
                      Add IP
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
