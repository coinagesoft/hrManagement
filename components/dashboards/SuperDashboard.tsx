"use client";
import Link from "next/link";
import { Building2, CheckCircle2, PauseCircle, Users } from "lucide-react";
import { Btn, Card, CardHeader, PageHeader, StatCard, StatusBadge, Table, Td, Th, Progress } from "@/components/ui";
import { COMPANIES, GROWTH } from "@/lib/mock";
import { fmtDate } from "@/lib/dates";

export default function SuperDashboard() {
  const total = COMPANIES.length;
  const active = COMPANIES.filter((c) => c.status === "Active").length;
  const users = COMPANIES.reduce((a, c) => a + c.users, 0);
  const max = Math.max(...GROWTH.map((g) => g.v), 1);
  const top = [...COMPANIES].sort((a, b) => b.users - a.users).slice(0, 5);

  return (
    <>
      <PageHeader title="Platform overview" desc="All companies on the platform at a glance."
        actions={<Link href="/super/companies"><Btn>Add company</Btn></Link>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Companies" value={total} icon={Building2} hint="Total onboarded" />
        <StatCard label="Active" value={active} icon={CheckCircle2} tone="green" hint="Currently using the platform" />
        <StatCard label="Suspended" value={total - active} icon={PauseCircle} tone="rose" hint="Access paused" />
        <StatCard label="Total users" value={users.toLocaleString("en-IN")} icon={Users} tone="blue" hint="Across all companies" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="New companies" desc="Added in the last 6 months" />
          <div className="flex h-52 items-end gap-4 px-6 pb-6 pt-8">
            {GROWTH.map((g) => (
              <div key={g.m} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-medium text-slate-600">{g.v}</span>
                <div className="w-full max-w-12 rounded-t-md bg-indigo-500" style={{ height: `${(g.v / max) * 100}%`, minHeight: g.v ? 6 : 2, opacity: g.v ? 1 : 0.2 }} />
                <span className="text-xs text-slate-500">{g.m}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Largest companies" desc="By number of users" />
          <ul className="space-y-4 p-5">
            {top.map((c) => (
              <li key={c.id}>
                <div className="mb-1.5 flex justify-between text-sm"><span className="truncate text-slate-700">{c.name}</span><span className="font-medium text-slate-900">{c.users}</span></div>
                <Progress value={(c.users / top[0].users) * 100} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Recently added" action={<Link href="/super/companies" className="text-sm font-medium text-indigo-600">View all</Link>} />
        <Table>
          <thead><tr><Th>Company</Th><Th>Owner</Th><Th>Users</Th><Th>Added</Th><Th>Status</Th></tr></thead>
          <tbody>
            {[...COMPANIES].sort((a, b) => b.created.localeCompare(a.created)).slice(0, 4).map((c) => (
              <tr key={c.id}>
                <Td className="font-medium text-slate-900">{c.name}</Td><Td>{c.admin}</Td><Td>{c.users}</Td><Td>{fmtDate(c.created)}</Td><Td><StatusBadge s={c.status} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
