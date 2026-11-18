import { employees } from "./data";
import { TODAY, iso, pad, fmtShort } from "./dates";
import type { Role } from "./roles";

// ---------- who is "me" in this preview ----------
export const ME: Record<"employee" | "hr" | "admin", string> = { employee: "EMP-001", hr: "hr", admin: "admin" };
export const STAFF_NAME = { hr: "Rohan Desai", admin: "Meera Joshi" } as const;
export const empName = (code: string) => employees.find((e) => e.code === code)?.name ?? code;
export const nameOf = (id: string) => (id === "hr" || id === "admin" ? STAFF_NAME[id] : empName(id));
export const isEmp = (id: string) => id.startsWith("EMP-");
// the signed-in HR/Admin people also appear in the employee list; they must not be offered as "employees"
export const isStaffName = (name: string) => Object.values(STAFF_NAME).includes(name as never);

export const nowStamp = () => {
  const n = new Date();
  return `${iso(TODAY)}T${pad(n.getHours())}:${pad(n.getMinutes())}`;
};
export const fmtStamp = (s: string) => `${fmtShort(s.slice(0, 10))}, ${s.slice(11, 16)}`;

// ---------- documents ----------
export type FileMeta = { name: string; size: number; data?: string };
export type DocItem = {
  id: string; emp: string; kind: string;
  by: "hr" | "admin" | "employee";               // who asked
  status: "Requested" | "Received" | "Pending" | "Issued" | "Rejected";
  date: string; note?: string; file?: FileMeta;
};
export const ASK_KINDS = ["National ID", "PAN card", "Address proof", "Bank details proof", "Other"];
export const LETTER_KINDS = ["Offer letter", "Increment letter"];
export const DOC_KEY = "hrm:docs:v1";
export const DOC_SEED: DocItem[] = [
  { id: "d1", emp: "EMP-001", kind: "National ID", by: "hr", status: "Requested", date: "2026-11-16", note: "Front and back, PDF or photo" },
  { id: "d2", emp: "EMP-001", kind: "Offer letter", by: "employee", status: "Issued", date: "2026-10-02", file: { name: "offer-letter.pdf", size: 84000 } },
  { id: "d3", emp: "EMP-001", kind: "Address proof", by: "hr", status: "Received", date: "2026-09-10", file: { name: "address-proof.pdf", size: 120000 } },
  { id: "d4", emp: "EMP-003", kind: "PAN card", by: "hr", status: "Received", date: "2026-11-05", file: { name: "pan-vikram.jpg", size: 210000 } },
  { id: "d5", emp: "EMP-004", kind: "Increment letter", by: "employee", status: "Pending", date: "2026-11-15", note: "Needed for a bank loan" },
  { id: "d6", emp: "EMP-005", kind: "National ID", by: "hr", status: "Requested", date: "2026-11-14" },
];

// ---------- messages ----------
// A thread id says who is in it:  "EMP-001:hr" · "EMP-001:admin" · "EMP-001:both" · "hr:admin".
// No thread can ever contain two employees, so employee-to-employee chat is impossible by design.
export type Msg = { id: string; thread: string; from: string; text: string; note?: boolean; at: string };
export const MSG_KEY = "hrm:msgs:v1";
export const MSG_SEED: Msg[] = [
  { id: "m1", thread: "EMP-001:hr", from: "hr", text: "Hi Ananya, please upload your national ID under Documents when you can.", at: "2026-11-16T11:05" },
  { id: "m2", thread: "EMP-001:hr", from: "EMP-001", text: "Sure, I will do it today.", at: "2026-11-16T11:20" },
  { id: "m3", thread: "EMP-004:both", from: "EMP-004", text: "I have asked for an increment letter for a bank loan. Could it be ready this week?", at: "2026-11-15T16:40" },
  { id: "m4", thread: "hr:admin", from: "admin", text: "Is October payroll ready for review?", at: "2026-11-16T09:15" },
  { id: "m5", thread: "hr:admin", from: "hr", text: "Yes, I am finalising it today.", at: "2026-11-16T09:32" },
];

export const participants = (t: string) => {
  const [a, b] = t.split(":");
  return b === "both" ? [a, "hr", "admin"] : [a, b];
};
export const canJoin = (t: string) => participants(t).filter(isEmp).length <= 1;

export type Me = { role: Role; id: string };
export function threadLabel(t: string, me: string) {
  const p = participants(t);
  const emp = p.find(isEmp);
  if (me === ME.employee || isEmp(me)) {
    if (t.endsWith(":both")) return { title: "Admin & HR", sub: "Both can see this" };
    const s = p.find((x) => !isEmp(x))!;
    return { title: `${s === "hr" ? "HR" : "Admin"} · ${nameOf(s)}`, sub: "Direct" };
  }
  if (emp) return { title: nameOf(emp), sub: t.endsWith(":both") ? "Sent to Admin & HR" : "Direct" };
  const other = p.find((x) => x !== me)!;
  return { title: `${other === "hr" ? "HR" : "Admin"} · ${nameOf(other)}`, sub: "Staff" };
}
