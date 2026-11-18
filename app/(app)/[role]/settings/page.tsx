"use client";
import { useState } from "react";
import { Info, Plus, Trash2, Wifi } from "lucide-react";
import { Badge, Btn, Card, CardHeader, Notice, PageHeader, Table, Td, Th } from "@/components/ui";
import { Field, Tabs, Toggle, inputCls, useToast } from "@/components/interactive";
import { DAYS_SHORT } from "@/lib/dates";
import { cn } from "@/lib/cn";

type Net = { id: string; label: string; ip: string; active: boolean };

export default function SettingsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"company" | "hours" | "network">("company");
  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [wifi, setWifi] = useState(true);
  const [wfh, setWfh] = useState({ enabled: true, sameDay: true, limit: 4 });
  const [nets, setNets] = useState<Net[]>([{ id: "n1", label: "Pune Office", ip: "203.0.113.10", active: true }]);
  const [n, setN] = useState({ label: "", ip: "" });
  const save = () => toast("Settings saved");

  return (
    <>
      <PageHeader title="Company settings" desc="Work hours, office network and WFH rules." actions={<Btn onClick={save}>Save changes</Btn>} />
      <Tabs tabs={[{ id: "company", label: "Company" }, { id: "hours", label: "Work hours" }, { id: "network", label: "Network and WFH" }]} value={tab} onChange={setTab} />

      {tab === "company" && (
        <Card className="max-w-2xl"><CardHeader title="Company profile" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Company name"><input className={inputCls} defaultValue="Acme Technologies Pvt Ltd" /></Field></div>
            <Field label="Timezone"><select className={inputCls} defaultValue="Asia/Kolkata"><option>Asia/Kolkata</option><option>Asia/Dubai</option><option>Europe/London</option><option>America/New_York</option></select></Field>
            <Field label="Currency"><input className={inputCls} defaultValue="INR (Rs)" readOnly /></Field>
            <div className="sm:col-span-2"><Field label="Company logo" hint="PNG or SVG, shown on payslips."><input type="file" className={inputCls} /></Field></div>
          </div>
        </Card>
      )}

      {tab === "hours" && (
        <Card className="max-w-2xl"><CardHeader title="Work schedule" desc="Used for late marking and monthly attendance." />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Start time"><input type="time" className={inputCls} defaultValue="09:30" /></Field>
            <Field label="End time"><input type="time" className={inputCls} defaultValue="18:30" /></Field>
            <Field label="Grace time (minutes)" hint="Check-ins within this window are not marked late."><input type="number" className={inputCls} defaultValue={15} /></Field>
            <Field label="Half-day if under (hours)"><input type="number" className={inputCls} defaultValue={4} /></Field>
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-sm font-medium text-slate-700">Working days</p>
              <div className="flex flex-wrap gap-2">
                {DAYS_SHORT.map((d, i) => (
                  <button key={d} onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i])}
                    className={cn("h-10 w-12 rounded-lg border text-sm font-medium", days.includes(i) ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-500")}>{d}</button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2"><Field label="Auto check-out time" hint="Open sessions are closed at this time and flagged for HR review."><input type="time" className={inputCls} defaultValue="23:30" /></Field></div>
          </div>
        </Card>
      )}

      {tab === "network" && (
        <div className="max-w-3xl space-y-6">
          <Card>
            <CardHeader title="Office network check" desc="Employees can check in only from these networks."
              action={<div className="flex items-center gap-2"><span className="text-sm text-slate-500">{wifi ? "On" : "Off"}</span><Toggle label="Office network check" checked={wifi} onChange={setWifi} /></div>} />
            <div className={cn(!wifi && "pointer-events-none opacity-50")}>
              <Table>
                <thead><tr><Th>Label</Th><Th>Public IP</Th><Th>Status</Th><Th /></tr></thead>
                <tbody>
                  {nets.map((x) => (
                    <tr key={x.id}>
                      <Td className="font-medium text-slate-900"><span className="flex items-center gap-2"><Wifi className="h-4 w-4 text-slate-400" />{x.label}</span></Td>
                      <Td className="font-mono text-xs">{x.ip}</Td>
                      <Td><Toggle label="Active" checked={x.active} onChange={(v) => setNets(nets.map((y) => (y.id === x.id ? { ...y, active: v } : y)))} /></Td>
                      <Td className="text-right"><Btn size="sm" variant="ghost" icon={Trash2} onClick={() => setNets(nets.filter((y) => y.id !== x.id))}>Remove</Btn></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <form className="flex flex-wrap items-end gap-3 border-t border-slate-100 p-5" onSubmit={(e) => { e.preventDefault(); setNets([...nets, { id: `n${Date.now()}`, ...n, active: true }]); setN({ label: "", ip: "" }); toast("Office network added"); }}>
                <div className="min-w-40 flex-1"><Field label="Label"><input required className={inputCls} placeholder="Mumbai Office" value={n.label} onChange={(e) => setN({ ...n, label: e.target.value })} /></Field></div>
                <div className="min-w-40 flex-1"><Field label="Public IP"><input required className={inputCls} placeholder="203.0.113.25" value={n.ip} onChange={(e) => setN({ ...n, ip: e.target.value })} /></Field></div>
                <Btn type="button" variant="outline" onClick={() => setN({ ...n, ip: "203.0.113.57" })}>Use my current IP</Btn>
                <Btn type="submit" icon={Plus}>Add</Btn>
              </form>
              <div className="px-5 pb-5"><Notice tone="amber" icon={Info}>Open this page while connected to the office WiFi and click <b>Use my current IP</b>. Ask your internet provider for a <b>static IP</b>, otherwise the address can change and block check-ins.</Notice></div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Work from home" desc="Always requires HR approval." action={<Badge tone="indigo">HR approval required</Badge>} />
            <ul className="divide-y divide-slate-100">
              <li className="flex items-center justify-between px-5 py-4"><div><p className="text-sm font-medium text-slate-900">Enable WFH requests</p><p className="text-sm text-slate-500">Employees can request remote days.</p></div><Toggle label="Enable WFH" checked={wfh.enabled} onChange={(v) => setWfh({ ...wfh, enabled: v })} /></li>
              <li className="flex items-center justify-between px-5 py-4"><div><p className="text-sm font-medium text-slate-900">Allow same-day requests</p><p className="text-sm text-slate-500">Otherwise requests must be made in advance.</p></div><Toggle label="Same day" checked={wfh.sameDay} onChange={(v) => setWfh({ ...wfh, sameDay: v })} /></li>
              <li className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="text-sm font-medium text-slate-900">Monthly limit per employee</p><p className="text-sm text-slate-500">Maximum approved WFH days each month.</p></div><input type="number" className={`${inputCls} !w-24`} value={wfh.limit} onChange={(e) => setWfh({ ...wfh, limit: Number(e.target.value) })} /></li>
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
