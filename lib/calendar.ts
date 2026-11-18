import { TODAY, parseISO, iso, fmtShort } from "./dates";

export type LeaveType = "Casual" | "Sick" | "Paid";
export type Leave = {
  id: string; emp: string; type: LeaveType; from: string; to: string;
  half?: boolean; reason?: string; status: "Pending" | "Approved" | "Rejected";
};
export type Holiday = { id: string; date: string; name: string };
export type Policy = { casual: number; sick: number }; // days credited to every employee each month

export const HOL_KEY = "hrm:holidays:v1";
export const LEAVE_KEY = "hrm:leaves:v1";
export const POLICY_KEY = "hrm:policy:v1";
export const PAID_QUOTA = 12; // paid leave stays a yearly quota

export const POLICY_SEED: Policy = { casual: 1, sick: 0.5 };
export const HOL_SEED: Holiday[] = [
  { id: "h1", date: "2026-05-01", name: "Maharashtra Day" },
  { id: "h2", date: "2026-08-15", name: "Independence Day" },
  { id: "h3", date: "2026-11-24", name: "Guru Nanak Jayanti" },
  { id: "h4", date: "2026-12-25", name: "Christmas" },
  { id: "h5", date: "2027-01-26", name: "Republic Day" },
];
export const LEAVE_SEED: Leave[] = [
  { id: "l1", emp: "EMP-001", type: "Casual", from: "2026-11-11", to: "2026-11-11", status: "Approved" },
  { id: "l2", emp: "EMP-001", type: "Sick", from: "2026-10-02", to: "2026-10-03", status: "Approved" },
  { id: "l3", emp: "EMP-001", type: "Paid", from: "2026-11-27", to: "2026-11-27", status: "Pending" },
  { id: "l4", emp: "EMP-004", type: "Casual", from: "2026-11-17", to: "2026-11-18", reason: "Family function", status: "Pending" },
  { id: "l5", emp: "EMP-005", type: "Sick", from: "2026-11-20", to: "2026-11-20", half: true, reason: "Dental appointment", status: "Pending" },
  { id: "l6", emp: "EMP-006", type: "Paid", from: "2026-11-23", to: "2026-11-27", reason: "Travel", status: "Pending" },
  { id: "l7", emp: "EMP-003", type: "Casual", from: "2026-11-05", to: "2026-11-05", status: "Approved" },
  { id: "l8", emp: "EMP-003", type: "Sick", from: "2026-11-12", to: "2026-11-13", status: "Approved" },
  { id: "l9", emp: "EMP-006", type: "Casual", from: "2026-11-02", to: "2026-11-02", status: "Approved" },
  { id: "l10", emp: "EMP-005", type: "Paid", from: "2026-12-01", to: "2026-12-04", status: "Approved" },
];

export const newId = (p: string) => p + Date.now().toString(36);
export const dateOf = (y: number, m: number, d: number) => iso(new Date(y, m, d));
export const isWeekend = (s: string) => [0, 6].includes(parseISO(s).getDay());

export function eachDay(from: string, to: string) {
  const out: string[] = [];
  for (let d = parseISO(from); iso(d) <= to; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) out.push(iso(d));
  return out;
}

// Weekends and company holidays don't use up leave.
export function leaveDays(l: Pick<Leave, "from" | "to" | "half">, holidays: Holiday[]) {
  const off = new Set(holidays.map((h) => h.date));
  const n = eachDay(l.from, l.to).filter((d) => !isWeekend(d) && !off.has(d)).length;
  return l.half ? n * 0.5 : n;
}

export const fmtRange = (a: string, b: string) => (a === b ? fmtShort(a) : `${fmtShort(a)}–${fmtShort(b)}`);
export const fmtN = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

// Casual and sick are credited monthly from January up to the current month; pending requests are held back.
export function balance(emp: string, leaves: Leave[], holidays: Holiday[], policy: Policy) {
  const months = TODAY.getMonth() + 1;
  const year = String(TODAY.getFullYear());
  const used = (t: LeaveType) => leaves
    .filter((l) => l.emp === emp && l.type === t && l.status !== "Rejected" && l.from.startsWith(year))
    .reduce((s, l) => s + leaveDays(l, holidays), 0);
  const row = (credited: number, t: LeaveType) => ({ credited, used: used(t), left: credited - used(t) });
  return { Casual: row(policy.casual * months, "Casual"), Sick: row(policy.sick * months, "Sick"), Paid: row(PAID_QUOTA, "Paid") };
}
