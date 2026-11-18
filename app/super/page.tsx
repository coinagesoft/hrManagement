import Link from "next/link";
import { PageHeader, Card, Stat, Table, Badge } from "@/components/ui";
import { companies } from "@/lib/data";

export default function SuperDashboard() {
  return (
    <>
      <PageHeader title="Platform overview" sub="Every company on the platform" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Companies" value={companies.length} />
        <Stat label="Users" value={128} />
        <Stat label="Active" value={4} />
        <Stat label="Suspended" value={1} />
      </div>
      <Card title="Newest companies" flush className="mt-6" action={<Link href="/super/companies" className="btn-ghost btn-sm">Manage companies</Link>}>
        <Table head={["Company", "Admin", "Users", "Status", "Added"]}
          rows={companies.slice(-3).map((c) => [c.name, c.admin, <span key="u" className="num">{c.users}</span>, <Badge key="s">{c.status}</Badge>, c.since])} />
      </Card>
    </>
  );
}
