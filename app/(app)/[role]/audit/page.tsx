"use client";
import { useState } from "react";
import { ScrollText, Search } from "lucide-react";
import { Avatar, Badge, Card, Empty, PageHeader, Table, Td, Th, type Tone } from "@/components/ui";
import { inputCls } from "@/components/interactive";
import { AUDIT_COMPANY, AUDIT_PLATFORM } from "@/lib/mock";
import { useRole } from "@/lib/role";

export default function AuditPage() {
  const role = useRole();
  const data = role === "super" ? AUDIT_PLATFORM : AUDIT_COMPANY;
  const [q, setQ] = useState("");
  const [action, setAction] = useState("All");
  const actions = [...new Set(data.map((d) => d.action))];
  const shown = data.filter((d) => (d.who + d.action + d.detail).toLowerCase().includes(q.toLowerCase()) && (action === "All" || d.action === action));

  return (
    <>
      <PageHeader title={role === "super" ? "Platform activity" : "Audit log"} desc="A permanent record of important actions: who did what, and when." />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-60 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className={`${inputCls} pl-9`} placeholder="Search activity" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className={`${inputCls} !w-auto`} value={action} onChange={(e) => setAction(e.target.value)}><option>All</option>{actions.map((a) => <option key={a}>{a}</option>)}</select>
        </div>
        {shown.length === 0 ? <Empty icon={ScrollText} title="No activity found" /> : (
          <Table>
            <thead><tr><Th>When</Th><Th>User</Th><Th>Action</Th><Th>Details</Th></tr></thead>
            <tbody>
              {shown.map((d, i) => (
                <tr key={i}>
                  <Td className="whitespace-nowrap text-slate-500">{d.t}</Td>
                  <Td><div className="flex items-center gap-2"><Avatar name={d.who} size={26} /><span className="whitespace-nowrap">{d.who}</span></div></Td>
                  <Td><Badge tone={d.tone as Tone}>{d.action}</Badge></Td><Td>{d.detail}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
