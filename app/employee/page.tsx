import Link from "next/link";
import { PageHeader, Card, Stat } from "@/components/ui";
import { LeaveLeftStat } from "@/components/leave";
import { UpcomingHolidays } from "@/components/calendar";
import { DocNudge } from "@/components/documents";

export default function Home() {
  return (
    <>
      <PageHeader title="Good morning, Ananya" sub="Tuesday, 17 November" />
      <section className="rounded-xl border border-line bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="num text-6xl font-semibold tracking-tight">09:42</p>
            <p className="mt-3 flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Office network verified <span className="num text-mute">203.0.113.24</span></p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <button className="btn px-8 py-3 text-base">Check in</button>
            <p className="text-sm text-mute">Not at the office? <Link href="/employee/leave" className="text-pine underline">Request WFH</Link></p>
          </div>
        </div>
      </section>
      <DocNudge />
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <LeaveLeftStat />
        <Stat label="Present in November" value="11 of 12 days" note="1 late mark" />
        <Stat label="October payslip" value="₹60,400" note="Paid 31 Oct" />
      </div>
      <Card title="Upcoming holidays" className="mt-6">
        <UpcomingHolidays />
      </Card>
    </>
  );
}
