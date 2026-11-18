import Link from "next/link";
import { PageHeader, Card, Stat } from "@/components/ui";
import { leaveRequests, wfhRequests } from "@/lib/data";
import { UpcomingHolidays } from "@/components/calendar";

const mix = [["Office", 17, "bg-pine"], ["WFH", 4, "bg-sky-500"], ["On leave", 3, "bg-slate-400"], ["Absent", 2, "bg-rose-500"]] as const;

export function StaffDashboard({ title, approvals }: { title: string; approvals?: string }) {
  return (
    <>
      <PageHeader title={title} sub="Sahyadri Logistics, today" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Headcount" value={26} />
        <Stat label="Present today" value={21} />
        <Stat label="On leave" value={3} />
        <Stat label="WFH today" value={4} />
        <Stat label="Pending requests" value={leaveRequests.length + wfhRequests.length} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card title="Where everyone is today">
            <div className="flex h-3 overflow-hidden rounded-full">
              {mix.map(([k, n, c]) => <div key={k} className={c} style={{ width: `${(n / 26) * 100}%` }} />)}
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {mix.map(([k, n, c]) => (
                <li key={k} className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${c}`} />{k}<span className="num ml-auto font-medium sm:ml-1">{n}</span></li>
              ))}
            </ul>
          </Card>
          <Card title="Waiting for a decision" action={approvals && <Link href={approvals} className="btn-ghost btn-sm">Open approvals</Link>}>
            <ul className="divide-y divide-line text-sm">
              {leaveRequests.slice(0, 2).map((r) => (
                <li key={r.who} className="flex items-center justify-between py-2.5"><span><b className="font-medium">{r.who}</b> asked for {r.days} day{r.days === 1 ? "" : "s"} of {r.type.toLowerCase()} leave</span><span className="text-mute">{r.dates}</span></li>
              ))}
              {wfhRequests.map((r) => (
                <li key={r.who} className="flex items-center justify-between py-2.5"><span><b className="font-medium">{r.who}</b> asked to work from home</span><span className="text-mute">{r.dates}</span></li>
              ))}
            </ul>
          </Card>
        </div>
        <Card title="Upcoming holidays"><UpcomingHolidays /></Card>
      </div>
    </>
  );
}
