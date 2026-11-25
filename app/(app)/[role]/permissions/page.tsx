"use client";

import { useEffect, useState } from "react";
import { Lock, RotateCcw, ShieldCheck, Loader2 } from "lucide-react";
import { Btn, Card, Notice, PageHeader, SectionLoader } from "@/components/ui";
import { Toggle, useToast } from "@/components/interactive";
import { PERMS } from "@/lib/mock";

const defaultState = () =>
  Object.fromEntries(PERMS.map((p) => [p.key, { hr: p.hr, employee: p.employee }]));

export default function PermissionsPage() {
  const toast = useToast();
  const [state, setState] = useState<Record<string, { hr: boolean; employee: boolean }>>(defaultState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const modules = [...new Set(PERMS.map((p) => p.module))];

  const fetchPermissions = async () => {
    try {
      const res = await fetch("/api/admin/permissions");
      const json = await res.json();
      if (json?.success && json?.permissions) {
        setState(json.permissions);
      }
    } catch (err) {
      console.error("Failed to fetch permissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const handleToggle = (key: string, role: "hr" | "employee", v: boolean) => {
    setState((prev) => ({
      ...prev,
      [key]: { ...prev[key], [role]: v },
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: state }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");

      toast("Access changes saved and logged in audit trail");
      setDirty(false);
    } catch (err: any) {
      toast(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setState(defaultState());
    setDirty(true);
    toast("Reset to defaults (click Save to apply)");
  };

  return (
    <>
      <PageHeader
        title="Roles and access"
        sub="Choose what HR and employees can do in your company. Changes are saved to database and audited."
        actions={
          <div className="flex gap-2">
            <Btn variant="outline" icon={RotateCcw} onClick={handleReset}>
              Reset to defaults
            </Btn>
            <Btn disabled={!dirty || saving} onClick={handleSave}>
              {saving ? "Saving..." : "Save changes"}
            </Btn>
          </div>
        }
      />

      <div className="mb-6">
        <Notice tone="blue" icon={ShieldCheck}>
          Admins always have full access. Changes apply the next time a user opens a page, and each change is permanently logged in the audit trail.
        </Notice>
      </div>

      {loading ? (
        <SectionLoader message="Loading permissions..." />
      ) : (
        <div className="space-y-6">
          {modules.map((m) => (
            <Card key={m} flush>
              <div className="grid grid-cols-[1fr_5.5rem_5.5rem_5.5rem] items-center gap-2 border-b border-line bg-canvas px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-mute sm:grid-cols-[1fr_7rem_7rem_7rem]">
                <span>{m}</span>
                <span className="text-center">Admin</span>
                <span className="text-center">HR</span>
                <span className="text-center">Employee</span>
              </div>
              <ul className="divide-y divide-line">
                {PERMS.filter((p) => p.module === m).map((p) => (
                  <li
                    key={p.key}
                    className="grid grid-cols-[1fr_5.5rem_5.5rem_5.5rem] items-center gap-2 px-5 py-3 sm:grid-cols-[1fr_7rem_7rem_7rem]"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.label}</p>
                      <p className="font-mono text-xs text-mute">{p.key}</p>
                    </div>
                    <span className="flex justify-center text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <span className="flex justify-center">
                      <Toggle
                        label={`HR: ${p.label}`}
                        checked={state[p.key]?.hr ?? p.hr}
                        onChange={(v) => handleToggle(p.key, "hr", v)}
                      />
                    </span>
                    <span className="flex justify-center">
                      <Toggle
                        label={`Employee: ${p.label}`}
                        checked={state[p.key]?.employee ?? p.employee}
                        onChange={(v) => handleToggle(p.key, "employee", v)}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
