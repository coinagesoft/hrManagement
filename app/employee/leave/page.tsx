import { PageHeader, Card, Stat, Table, Badge } from "@/components/ui";
import { leaveHistory } from "@/lib/data";

export default function Leave() {
  return (
    <>
      <PageHeader title="Leave and work from home" sub="Your balance, requests and history." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Casual" value="6 left" note="of 8 days" />
        <Stat label="Sick" value="5 left" note="of 7 days" />
        <Stat label="Paid" value="3 left" note="of 12 days · 1 pending" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card title="New request">
          <div className="space-y-4">
            <div><label className="label" htmlFor="kind">Request</label><select id="kind" className="field"><option>Casual leave</option><option>Sick leave</option><option>Paid leave</option><option>Work from home</option></select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label" htmlFor="from">From</label><input id="from" type="date" className="field" /></div>
              <div><label className="label" htmlFor="to">To</label><input id="to" type="date" className="field" /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[var(--pine)]" />Half day</label>
            <div><label className="label" htmlFor="why">Reason</label><textarea id="why" rows={3} className="field" /></div>
            <button className="btn w-full">Send request</button>
          </div>
        </Card>
        <Card title="History" flush>
          <Table head={["Type", "Dates", "Days", "Status", ""]}
            rows={leaveHistory.map((l) => [l.type, l.dates, <span key="d" className="num">{l.days}</span>, <Badge key="s">{l.status}</Badge>, l.status === "Pending" ? <button key="c" className="btn-danger btn-sm">Cancel</button> : ""])} />
        </Card>
      </div>
    </>
  );
}
