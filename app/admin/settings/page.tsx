import { PageHeader, Card, Table, Badge } from "@/components/ui";

const perms = [
  ["employee.create", "Add employees", true, false],
  ["attendance.correct", "Correct attendance records", true, false],
  ["wfh.approve", "Approve or reject WFH", true, false],
  ["leave.approve", "Approve or reject leave", true, false],
  ["leave.policy_manage", "Create and edit leave types", true, false],
  ["payroll.run", "Generate payroll", true, false],
  ["payroll.mark_paid", "Mark payroll as paid", true, false],
  ["payslip.view_own", "View own payslips", true, true],
] as const;

export default function Settings() {
  return (
    <>
      <PageHeader title="Settings" sub="Work rules, office networks and who can do what.">
        <button className="btn">Save changes</button>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Office networks" flush action={<button className="btn-ghost btn-sm">Add my current IP</button>}>
          <label className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5 text-sm">
            <span><b className="font-medium">Only allow check-in from these networks</b><br /><span className="text-mute">Approved WFH days skip this check.</span></span>
            <input type="checkbox" defaultChecked className="h-4 w-4 accent-[var(--pine)]" />
          </label>
          <Table head={["Label", "IP address", "Status"]} rows={[
            ["Pune office", <span key="1" className="num">203.0.113.24</span>, <Badge key="a">Active</Badge>],
            ["Backup line", <span key="2" className="num">198.51.100.7</span>, <Badge key="b">Active</Badge>],
          ]} />
        </Card>
        <Card title="Work rules">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label" htmlFor="ws">Start time</label><input id="ws" type="time" defaultValue="09:30" className="field" /></div>
            <div><label className="label" htmlFor="we">End time</label><input id="we" type="time" defaultValue="18:30" className="field" /></div>
            <div><label className="label" htmlFor="gr">Grace (minutes)</label><input id="gr" type="number" defaultValue={15} className="field" /></div>
            <div><label className="label" htmlFor="wl">WFH days per month</label><input id="wl" type="number" defaultValue={4} className="field" /></div>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[var(--pine)]" />Allow same-day WFH requests</label>
        </Card>
      </div>
      <Card title="Permissions" flush className="mt-6">
        <Table head={["Permission", "What it allows", "HR", "Employee"]} rows={perms.map(([k, d, hr, em]) => [
          <code key="k" className="text-xs">{k}</code>, d,
          <input key="h" type="checkbox" defaultChecked={hr} aria-label={`HR ${k}`} className="h-4 w-4 accent-[var(--pine)]" />,
          <input key="e" type="checkbox" defaultChecked={em} aria-label={`Employee ${k}`} className="h-4 w-4 accent-[var(--pine)]" />,
        ])} />
      </Card>
    </>
  );
}
