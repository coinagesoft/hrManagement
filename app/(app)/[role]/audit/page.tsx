"use client";

import { useEffect, useState } from "react";
import { ScrollText, Search, Loader2 } from "lucide-react";
import { Avatar, Badge, Card, Empty, PageHeader, Table, Td, Th, type Tone } from "@/components/ui";
import { inputCls } from "@/components/interactive";
import { useRole } from "@/lib/role";

interface AuditEntry {
  id?: number;
  t: string;
  who: string;
  action: string;
  tone: Tone | string;
  detail: string;
}

export default function AuditPage() {
  const role = useRole();
  const isSuper = role === "super";

  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("All");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const endpoint = isSuper ? "/api/super/audit" : "/api/admin/audit";
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data?.success && data?.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [isSuper]);

  const actions = ["All", ...new Set(logs.map((d) => d.action))];
  const shown = logs.filter(
    (d) =>
      (d.who + " " + d.action + " " + d.detail).toLowerCase().includes(q.toLowerCase()) &&
      (action === "All" || d.action === action)
  );

  return (
    <>
      <PageHeader
        title={isSuper ? "Platform audit log" : "Audit trail"}
        desc={
          isSuper
            ? "Every action across companies and users is recorded for compliance."
            : "Every administrative decision, invite, approval and change is recorded permanently."
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className={`${inputCls} pl-9`}
            placeholder="Search by actor or detail..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className={`${inputCls} !w-auto`}
          value={action}
          onChange={(e) => setAction(e.target.value)}
        >
          {actions.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </div>

      <Card flush>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-pine" />
          </div>
        ) : shown.length === 0 ? (
          <Empty
            icon={ScrollText}
            title="No events found"
            desc="Try widening your search or choosing another action."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Timestamp</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody>
              {shown.map((d, i) => (
                <tr key={d.id ?? i}>
                  <Td className="whitespace-nowrap font-mono text-xs text-slate-500">{d.t}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Avatar name={d.who} size={24} />
                      <span className="font-medium text-slate-800">{d.who}</span>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={(d.tone as Tone) || "blue"}>{d.action}</Badge>
                  </Td>
                  <Td className="text-slate-600">{d.detail}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
