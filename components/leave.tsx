"use client";
import { useState } from "react";
import { PageHeader, Card, Stat, Table, Badge } from "@/components/ui";
import { usePersisted } from "@/lib/store";
import { ME, empName } from "@/lib/comms";
import { wfhRequests } from "@/lib/data";
import {
  HOL_KEY, HOL_SEED, LEAVE_KEY, LEAVE_SEED, POLICY_KEY, POLICY_SEED,
  balance, fmtN, fmtRange, leaveDays, newId, type Leave, type LeaveType,
} from "@/lib/calendar";

export function useLeaveData() {
  const [leaves, setLeaves] = usePersisted<Leave[]>(LEAVE_KEY, LEAVE_SEED);
  const [holidays] = usePersisted(HOL_KEY, HOL_SEED);
  const [policy] = usePersisted(POLICY_KEY, POLICY_SEED);
  return { leaves, setLeaves, holidays, policy };
}

/* Stat on the employee home page */
export function LeaveLeftStat() {
  const { leaves, holidays, policy } = useLeaveData();
  const b = balance(ME.employee, leaves, holidays, policy);
  return <Stat label="Leave left this year" value={`${fmtN(b.Casual.left + b.Sick.left + b.Paid.left)} days`}
    note={`Casual ${fmtN(b.Casual.left)} · Sick ${fmtN(b.Sick.left)} · Paid ${fmtN(b.Paid.left)}`} />;
}

/* Employee: leave page */
export function EmployeeLeave() {
  const me = ME.employee;
  const { leaves, setLeaves, holidays, policy } = useLeaveData();
  const [kind, setKind] = useState("Casual");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [half, setHalf] = useState(false);
  const [why, setWhy] = useState("");
  const [msg, setMsg] = useState("");
  const say = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3200); };

  const b = balance(me, leaves, holidays, policy);
  const mine = leaves.filter((l) => l.emp === me).sort((a, b2) => b2.from.localeCompare(a.from));
  const pendingPaid = mine.filter((l) => l.type === "Paid" && l.status === "Pending").length;
  const single = !to || to === from;

  const send = () => {
    if (kind === "Work from home") return say("Demo: work-from-home requests are not saved yet.");
    const type = kind as LeaveType;
    if (!from) return say("Choose a date.");
    const end = to || from;
    if (end < from) return say("The end date is before the start date.");
    const l: Leave = { id: newId("l"), emp: me, type, from, to: end, half: half && end === from, reason: why.trim() || undefined, status: "Pending" };
    const days = leaveDays(l, holidays);
    if (days === 0) return say("Those dates are a weekend or a holiday.");
    if (mine.some((x) => x.status !== "Rejected" && x.from <= end && from <= x.to)) return say("You already have leave on those dates.");
    if (days > b[type].left) return say(`Only ${fmtN(b[type].left)} ${type.toLowerCase()} day(s) left.`);
    setLeaves((all) => [l, ...all]);
    setFrom(""); setTo(""); setHalf(false); setWhy(""); say("Request sent to HR.");
  };

  return (
    <>
      <PageHeader title="Leave and work from home" sub="Your balance, requests and history." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Casual" value={`${fmtN(b.Casual.left)} left`} note={`of ${fmtN(b.Casual.credited)} credited · ${fmtN(policy.casual)} a month`} />
        <Stat label="Sick" value={`${fmtN(b.Sick.left)} left`} note={`of ${fmtN(b.Sick.credited)} credited · ${fmtN(policy.sick)} a month`} />
        <Stat label="Paid" value={`${fmtN(b.Paid.left)} left`} note={`of ${b.Paid.credited} days${pendingPaid ? ` · ${pendingPaid} pending` : ""}`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card title="New request">
          <div className="space-y-4">
            <div><label className="label" htmlFor="kind">Request</label>
              <select id="kind" className="field" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="Casual">Casual leave</option><option value="Sick">Sick leave</option><option value="Paid">Paid leave</option><option>Work from home</option></select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label" htmlFor="from">From</label><input id="from" type="date" className="field" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
              <div><label className="label" htmlFor="to">To</label><input id="to" type="date" className="field" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[var(--pine)]" checked={half && single} disabled={!single} onChange={(e) => setHalf(e.target.checked)} />Half day</label>
            <div><label className="label" htmlFor="why">Reason</label><textarea id="why" rows={3} className="field" value={why} onChange={(e) => setWhy(e.target.value)} /></div>
            <button className="btn w-full" onClick={send}>Send request</button>
            <p role="status" className="min-h-5 text-sm text-mute">{msg}</p>
          </div>
        </Card>
        <Card title="History" flush>
          <Table head={["Type", "Dates", "Days", "Status", ""]}
            rows={mine.map((l) => [l.type, fmtRange(l.from, l.to), <span key="d" className="num">{fmtN(leaveDays(l, holidays))}</span>, <Badge key="s">{l.status}</Badge>,
              l.status === "Pending" ? <button key="c" className="btn-danger btn-sm" onClick={() => setLeaves((all) => all.filter((x) => x.id !== l.id))}>Cancel</button> : ""])} />
        </Card>
      </div>
    </>
  );
}

/* HR: everything waiting for a decision, compact enough for a side column */
export function Approvals({ onPick }: { onPick?: (date: string) => void }) {
  const { leaves, setLeaves, holidays } = useLeaveData();
  const [wfh, setWfh] = useState<Record<string, string>>({});
  const pending = leaves.filter((l) => l.status === "Pending");
  const wfhOpen = wfhRequests.filter((r) => !wfh[r.who]);
  const decide = (id: string, status: Leave["status"]) => setLeaves((all) => all.map((l) => (l.id === id ? { ...l, status } : l)));
  const total = pending.length + wfhOpen.length;
  const btns = (ok: () => void, no: () => void) => (
    <div className="mt-2 flex gap-2"><button className="btn btn-sm" onClick={ok}>Approve</button><button className="btn-danger btn-sm" onClick={no}>Reject</button></div>
  );
  return (
    <Card title="Waiting for approval" action={<span className="num text-sm text-mute">{total}</span>}>
      {total === 0 ? <p className="text-sm text-mute">Nothing waiting for a decision.</p> : (
        <ul className="-my-3 divide-y divide-line text-sm">
          {pending.map((l) => (
            <li key={l.id} className="py-3">
              <div className="flex items-baseline justify-between gap-2">
                <button className="font-medium hover:underline" onClick={() => onPick?.(l.from)}>{empName(l.emp)}</button>
                <span className="num text-xs text-mute">{fmtN(leaveDays(l, holidays))} day{leaveDays(l, holidays) === 1 ? "" : "s"}</span>
              </div>
              <p className="text-xs text-mute">{l.type} leave · {fmtRange(l.from, l.to)}{l.reason ? ` · ${l.reason}` : ""}</p>
              {btns(() => decide(l.id, "Approved"), () => decide(l.id, "Rejected"))}
            </li>
          ))}
          {wfhOpen.map((r) => (
            <li key={r.who} className="py-3">
              <b className="font-medium">{r.who}</b>
              <p className="text-xs text-mute">Work from home · {r.dates} · {r.reason}</p>
              {btns(() => setWfh((w) => ({ ...w, [r.who]: "Approved" })), () => setWfh((w) => ({ ...w, [r.who]: "Rejected" })))}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
