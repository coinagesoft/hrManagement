"use client";
import { useState } from "react";
import { Lock, RotateCcw, ShieldCheck } from "lucide-react";
import { Btn, Card, Notice, PageHeader } from "@/components/ui";
import { Toggle, useToast } from "@/components/interactive";
import { PERMS } from "@/lib/mock";

const initial = () => Object.fromEntries(PERMS.map((p) => [p.key, { hr: p.hr, employee: p.employee }]));

export default function PermissionsPage() {
  const toast = useToast();
  const [state, setState] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const modules = [...new Set(PERMS.map((p) => p.module))];

  const set = (key: string, role: "hr" | "employee", v: boolean) => { setState({ ...state, [key]: { ...state[key], [role]: v } }); setDirty(true); };

  return (
    <>
      <PageHeader title="Roles and access" desc="Choose what HR and employees can do in your company."
        actions={<><Btn variant="outline" icon={RotateCcw} onClick={() => { setState(initial()); setDirty(false); toast("Reset to defaults"); }}>Reset to defaults</Btn><Btn disabled={!dirty} onClick={() => { setDirty(false); toast("Access changes saved and logged"); }}>Save changes</Btn></>} />
      <div className="mb-6"><Notice tone="blue" icon={ShieldCheck}>Admins always have full access. Changes apply the next time a user opens a page, and each change is recorded in the audit log.</Notice></div>
      <div className="space-y-6">
        {modules.map((m) => (
          <Card key={m}>
            <div className="grid grid-cols-[1fr_5.5rem_5.5rem_5.5rem] items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500 sm:grid-cols-[1fr_7rem_7rem_7rem]">
              <span>{m}</span><span className="text-center">Admin</span><span className="text-center">HR</span><span className="text-center">Employee</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {PERMS.filter((p) => p.module === m).map((p) => (
                <li key={p.key} className="grid grid-cols-[1fr_5.5rem_5.5rem_5.5rem] items-center gap-2 px-5 py-3 sm:grid-cols-[1fr_7rem_7rem_7rem]">
                  <div><p className="text-sm font-medium text-slate-800">{p.label}</p><p className="font-mono text-xs text-slate-400">{p.key}</p></div>
                  <span className="flex justify-center text-slate-400"><Lock className="h-4 w-4" /></span>
                  <span className="flex justify-center"><Toggle label={`HR: ${p.label}`} checked={state[p.key].hr} onChange={(v) => set(p.key, "hr", v)} /></span>
                  <span className="flex justify-center"><Toggle label={`Employee: ${p.label}`} checked={state[p.key].employee} onChange={(v) => set(p.key, "employee", v)} /></span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
