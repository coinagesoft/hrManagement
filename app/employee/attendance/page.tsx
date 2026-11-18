import { PageHeader, Card, Stat, Table, Badge } from "@/components/ui";
import { attendance } from "@/lib/data";

export default function Attendance() {
  return (
    <>
      <PageHeader title="My attendance" sub="November 2026">
        <select className="field" aria-label="Month"><option>November 2026</option><option>October 2026</option></select>
      </PageHeader>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Present" value={8} /><Stat label="Late" value={1} /><Stat label="Half-days" value={1} /><Stat label="On leave" value={1} />
      </div>
      <Card flush>
        <Table head={["Date", "Check in", "Check out", "Where", "Status"]}
          rows={attendance.map((a) => [a.date, <span key="i" className="num">{a.in}</span>, <span key="o" className="num">{a.out}</span>, a.mode === "—" ? "—" : <Badge key="m">{a.mode}</Badge>, <Badge key="s">{a.status}</Badge>])} />
      </Card>
    </>
  );
}
