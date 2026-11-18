import { PageHeader, Card, Table, Person } from "@/components/ui";
import { leaveRequests, wfhRequests } from "@/lib/data";

const actions = (
  <div className="flex gap-2"><button className="btn btn-sm">Approve</button><button className="btn-danger btn-sm">Reject</button></div>
);

export default function Approvals() {
  return (
    <>
      <PageHeader title="Approvals" sub="Leave and work-from-home requests waiting for you." />
      <div className="space-y-6">
        <Card title="Leave requests" flush>
          <Table head={["Employee", "Type", "Dates", "Days", "Reason", ""]}
            rows={leaveRequests.map((r) => [<Person key="p" name={r.who} />, r.type, r.dates, <span key="d" className="num">{r.days}</span>, r.reason, actions])} />
        </Card>
        <Card title="Work from home requests" flush>
          <Table head={["Employee", "Date", "Reason", ""]}
            rows={wfhRequests.map((r) => [<Person key="p" name={r.who} />, r.dates, r.reason, actions])} />
        </Card>
      </div>
    </>
  );
}
