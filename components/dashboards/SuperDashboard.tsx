"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, CheckCircle2, PauseCircle, Users, Loader2 } from "lucide-react";
import { Btn, Card, CardHeader, PageHeader, StatCard, StatusBadge, Table, Td, Th, Progress } from "@/components/ui";
import { fmtDate } from "@/lib/dates";

interface SuperStats {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  totalUsers: number;
  growth: { m: string; v: number }[];
  topCompanies: any[];
  recentCompanies: any[];
}

export default function SuperDashboard() {
  const [stats, setStats] = useState<SuperStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/super/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data?.stats) {
          setStats(data.stats);
        }
      })
      .catch((err) => console.error("Error loading stats:", err))
      .finally(() => setLoading(false));
  }, []);

  const total = stats?.totalCompanies ?? 0;
  const active = stats?.activeCompanies ?? 0;
  const suspended = stats?.suspendedCompanies ?? 0;
  const users = stats?.totalUsers ?? 0;

  const growthData = stats?.growth ?? [];
  const maxGrowth = growthData.length > 0 ? Math.max(...growthData.map((g) => g.v), 1) : 1;

  const top = stats?.topCompanies ?? [];
  const topMax = top.length > 0 ? Math.max(...top.map((c) => c.users), 1) : 1;

  const recent = stats?.recentCompanies ?? [];

  return (
    <>
      <PageHeader
        title="Platform overview"
        desc="All companies on the platform at a glance directly synced with MySQL."
        actions={
          <Link href="/super/companies">
            <Btn>Add company</Btn>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Companies" value={total} icon={Building2} hint="Total onboarded" />
        <StatCard label="Active" value={active} icon={CheckCircle2} tone="green" hint="Currently using the platform" />
        <StatCard label="Suspended" value={suspended} icon={PauseCircle} tone="rose" hint="Access paused" />
        <StatCard label="Total users" value={users.toLocaleString("en-IN")} icon={Users} tone="blue" hint="Across all companies" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="New companies" desc="Added in the last 6 months" />
          <div className="flex h-52 items-end gap-4 px-6 pb-6 pt-8">
            {growthData.map((g) => (
              <div key={g.m} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-medium text-slate-600">{g.v}</span>
                <div
                  className="w-full max-w-12 rounded-t-md bg-indigo-500 transition-all duration-500"
                  style={{
                    height: `${(g.v / maxGrowth) * 100}%`,
                    minHeight: g.v ? 6 : 2,
                    opacity: g.v ? 1 : 0.2,
                  }}
                />
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
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="truncate text-slate-700 font-medium">{c.name}</span>
                  <span className="font-semibold text-slate-900">{c.users}</span>
                </div>
                <Progress value={(c.users / topMax) * 100} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Recently added"
          action={
            <Link href="/super/companies" className="text-sm font-medium text-indigo-600 hover:underline">
              View all
            </Link>
          }
        />
        <Table>
          <thead>
            <tr>
              <Th>Company</Th>
              <Th>Owner</Th>
              <Th>Users</Th>
              <Th>Added</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {recent.map((c) => (
              <tr key={c.id}>
                <Td className="font-medium text-slate-900">{c.name}</Td>
                <Td>{c.admin}</Td>
                <Td>{c.users}</Td>
                <Td>{c.created ? fmtDate(c.created) : "Recent"}</Td>
                <Td>
                  <StatusBadge s={c.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
