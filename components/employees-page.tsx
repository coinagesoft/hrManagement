import { PageHeader, Card, Table, Badge, Person } from "@/components/ui";
import { employees } from "@/lib/data";

export function EmployeesPage({ canAddHr }: { canAddHr?: boolean }) {
  return (
    <>
      <PageHeader title="Employees" sub="Deactivate people instead of deleting, so their history stays.">
        {canAddHr && <button className="btn-ghost">Add HR user</button>}
        <button className="btn">Add employee</button>
      </PageHeader>
      <Card flush>
        <div className="flex flex-wrap gap-3 border-b border-line p-4">
          <input className="field max-w-xs" placeholder="Search by name or code" aria-label="Search employees" />
          <select className="field max-w-[180px]" aria-label="Department"><option>All departments</option><option>Operations</option><option>Sales</option><option>Finance</option></select>
          <select className="field max-w-[160px]" aria-label="Status"><option>All statuses</option><option>Active</option><option>Inactive</option></select>
        </div>
        <Table
          head={["Employee", "Department", "Designation", "Today", "Status", ""]}
          rows={employees.map((e) => [
            <Person key="p" name={e.name} sub={e.code} />, e.dept, e.title,
            <Badge key="t">{e.today}</Badge>, <Badge key="s">{e.status}</Badge>,
            <button key="a" className="btn-ghost btn-sm">Edit</button>,
          ])}
        />
      </Card>
    </>
  );
}
