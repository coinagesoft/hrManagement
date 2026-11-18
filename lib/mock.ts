import { parseISO, pad } from "./dates";

export const BRAND = "PeopleDesk";
export const COMPANY = "Acme Technologies Pvt Ltd";

export type Person = {
  id: string; code: string; name: string; email: string; phone: string;
  dept: string; title: string; role: "ADMIN" | "HR" | "EMPLOYEE"; status: "Active" | "Inactive"; joined: string;
};

export const DEPARTMENTS = ["Engineering", "Design", "Sales", "Marketing", "Finance", "Support", "HR", "Management"];

export const PEOPLE: Person[] = [
  { id: "p1", code: "ACM-001", name: "Aarav Sharma", email: "aarav@acme.com", phone: "98900 11001", dept: "Management", title: "Founder & CEO", role: "ADMIN", status: "Active", joined: "2019-04-01" },
  { id: "p2", code: "ACM-002", name: "Priya Deshmukh", email: "priya@acme.com", phone: "98900 11002", dept: "HR", title: "HR Manager", role: "HR", status: "Active", joined: "2020-01-13" },
  { id: "p3", code: "ACM-014", name: "Rohan Patil", email: "rohan@acme.com", phone: "98900 11003", dept: "Engineering", title: "Senior Engineer", role: "EMPLOYEE", status: "Active", joined: "2021-06-07" },
  { id: "p4", code: "ACM-021", name: "Sneha Kulkarni", email: "sneha@acme.com", phone: "98900 11004", dept: "Design", title: "Product Designer", role: "EMPLOYEE", status: "Active", joined: "2021-09-20" },
  { id: "p5", code: "ACM-025", name: "Vikram Joshi", email: "vikram@acme.com", phone: "98900 11005", dept: "Sales", title: "Sales Executive", role: "EMPLOYEE", status: "Active", joined: "2022-02-14" },
  { id: "p6", code: "ACM-029", name: "Ananya Iyer", email: "ananya@acme.com", phone: "98900 11006", dept: "Marketing", title: "Marketing Lead", role: "EMPLOYEE", status: "Active", joined: "2022-05-02" },
  { id: "p7", code: "ACM-033", name: "Karan Mehta", email: "karan@acme.com", phone: "98900 11007", dept: "Engineering", title: "Software Engineer", role: "EMPLOYEE", status: "Active", joined: "2022-11-21" },
  { id: "p8", code: "ACM-038", name: "Neha Singh", email: "neha@acme.com", phone: "98900 11008", dept: "Finance", title: "Accountant", role: "EMPLOYEE", status: "Active", joined: "2023-03-06" },
  { id: "p9", code: "ACM-041", name: "Rahul Verma", email: "rahul@acme.com", phone: "98900 11009", dept: "Support", title: "Support Specialist", role: "EMPLOYEE", status: "Active", joined: "2023-07-17" },
  { id: "p10", code: "ACM-047", name: "Pooja Nair", email: "pooja@acme.com", phone: "98900 11010", dept: "HR", title: "HR Executive", role: "EMPLOYEE", status: "Active", joined: "2024-01-08" },
  { id: "p11", code: "ACM-052", name: "Isha Gupta", email: "isha@acme.com", phone: "98900 11011", dept: "Engineering", title: "QA Engineer", role: "EMPLOYEE", status: "Active", joined: "2024-08-05" },
  { id: "p12", code: "ACM-019", name: "Amit Kale", email: "amit@acme.com", phone: "98900 11012", dept: "Engineering", title: "Software Engineer", role: "EMPLOYEE", status: "Inactive", joined: "2021-03-15" },
];

export const WHO = {
  super: { name: "Platform Owner", sub: "Super Admin" },
  admin: { name: "Aarav Sharma", sub: "Admin" },
  hr: { name: "Priya Deshmukh", sub: "HR Manager" },
  employee: { name: "Rohan Patil", sub: "Senior Engineer" },
};

export type TeamRow = { name: string; dept: string; status: "Present" | "Late" | "On leave" | "Absent"; mode: "Office" | "WFH" | "-"; in: string; out: string; ip: string };
export const TEAM_TODAY: TeamRow[] = [
  { name: "Aarav Sharma", dept: "Management", status: "Present", mode: "Office", in: "09:05", out: "-", ip: "203.0.113.10" },
  { name: "Priya Deshmukh", dept: "HR", status: "Present", mode: "Office", in: "09:12", out: "-", ip: "203.0.113.10" },
  { name: "Rohan Patil", dept: "Engineering", status: "Present", mode: "Office", in: "09:20", out: "-", ip: "203.0.113.10" },
  { name: "Sneha Kulkarni", dept: "Design", status: "Present", mode: "WFH", in: "09:40", out: "-", ip: "Approved WFH" },
  { name: "Vikram Joshi", dept: "Sales", status: "Late", mode: "Office", in: "10:15", out: "-", ip: "203.0.113.10" },
  { name: "Ananya Iyer", dept: "Marketing", status: "Present", mode: "Office", in: "09:02", out: "-", ip: "203.0.113.10" },
  { name: "Karan Mehta", dept: "Engineering", status: "On leave", mode: "-", in: "-", out: "-", ip: "-" },
  { name: "Neha Singh", dept: "Finance", status: "Present", mode: "Office", in: "09:25", out: "-", ip: "203.0.113.10" },
  { name: "Rahul Verma", dept: "Support", status: "Present", mode: "WFH", in: "09:30", out: "-", ip: "Approved WFH" },
  { name: "Pooja Nair", dept: "HR", status: "Present", mode: "Office", in: "09:18", out: "-", ip: "203.0.113.10" },
  { name: "Isha Gupta", dept: "Engineering", status: "On leave", mode: "-", in: "-", out: "-", ip: "-" },
];

export type ReqStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";
export type LeaveReq = { id: string; who: string; type: string; from: string; to: string; days: number; reason: string; status: ReqStatus };
export const TEAM_LEAVES: LeaveReq[] = [
  { id: "l1", who: "Vikram Joshi", type: "Casual", from: "2026-11-23", to: "2026-11-24", days: 2, reason: "Family function", status: "Pending" },
  { id: "l2", who: "Ananya Iyer", type: "Sick", from: "2026-11-18", to: "2026-11-18", days: 1, reason: "Fever and cold", status: "Pending" },
  { id: "l3", who: "Neha Singh", type: "Earned", from: "2026-12-01", to: "2026-12-05", days: 5, reason: "Vacation", status: "Pending" },
  { id: "l4", who: "Karan Mehta", type: "Casual", from: "2026-11-17", to: "2026-11-17", days: 1, reason: "Personal work", status: "Approved" },
  { id: "l5", who: "Isha Gupta", type: "Sick", from: "2026-11-17", to: "2026-11-18", days: 2, reason: "Doctor appointment", status: "Approved" },
  { id: "l6", who: "Rahul Verma", type: "Casual", from: "2026-11-10", to: "2026-11-10", days: 1, reason: "Personal", status: "Rejected" },
];
export const MY_LEAVES: LeaveReq[] = [
  { id: "m3", who: "Rohan Patil", type: "Earned", from: "2026-12-24", to: "2026-12-26", days: 3, reason: "Year-end trip", status: "Pending" },
  { id: "m2", who: "Rohan Patil", type: "Sick", from: "2026-11-12", to: "2026-11-13", days: 2, reason: "Viral fever", status: "Approved" },
  { id: "m1", who: "Rohan Patil", type: "Casual", from: "2026-11-05", to: "2026-11-05", days: 1, reason: "Bank work", status: "Approved" },
  { id: "m0", who: "Rohan Patil", type: "Casual", from: "2026-09-14", to: "2026-09-14", days: 1, reason: "Personal", status: "Approved" },
];
export const BALANCES = [
  { type: "Casual", allocated: 12, used: 4, pending: 0, paid: true },
  { type: "Sick", allocated: 8, used: 2, pending: 0, paid: true },
  { type: "Earned", allocated: 15, used: 3, pending: 3, paid: true },
];
export const LEAVE_TYPES = ["Casual", "Sick", "Earned", "Unpaid"];

export type WfhReq = { id: string; who: string; date: string; reason: string; status: ReqStatus };
export const TEAM_WFH: WfhReq[] = [
  { id: "w1", who: "Sneha Kulkarni", date: "2026-11-18", reason: "Plumbing work at home", status: "Pending" },
  { id: "w2", who: "Rahul Verma", date: "2026-11-19", reason: "Internet installation at home", status: "Pending" },
  { id: "w3", who: "Karan Mehta", date: "2026-11-20", reason: "Waiting for a courier delivery", status: "Pending" },
  { id: "w4", who: "Pooja Nair", date: "2026-11-12", reason: "Doctor visit in the morning", status: "Approved" },
  { id: "w5", who: "Ananya Iyer", date: "2026-11-09", reason: "Feeling unwell", status: "Rejected" },
];
export const MY_WFH: WfhReq[] = [
  { id: "mw3", who: "Rohan Patil", date: "2026-11-24", reason: "Home repair work", status: "Pending" },
  { id: "mw2", who: "Rohan Patil", date: "2026-11-19", reason: "Focus work on release", status: "Approved" },
  { id: "mw1", who: "Rohan Patil", date: "2026-11-16", reason: "Electrician visit", status: "Approved" },
];

export type Holiday = { id: string; date: string; name: string; kind: "Public" | "Company" };
export const HOLIDAYS: Holiday[] = [
  { id: "h1", date: "2026-10-02", name: "Gandhi Jayanti", kind: "Public" },
  { id: "h2", date: "2026-10-20", name: "Dussehra", kind: "Public" },
  { id: "h3", date: "2026-11-08", name: "Diwali", kind: "Public" },
  { id: "h4", date: "2026-11-20", name: "Company Annual Day", kind: "Company" },
  { id: "h5", date: "2026-12-25", name: "Christmas", kind: "Public" },
  { id: "h6", date: "2027-01-01", name: "New Year's Day", kind: "Company" },
  { id: "h7", date: "2027-01-26", name: "Republic Day", kind: "Public" },
];

export type CalType = "holiday" | "leave" | "sick" | "wfh" | "pending";
export const CAL_META: Record<CalType, { label: string; chip: string; dot: string }> = {
  holiday: { label: "Holiday", chip: "bg-violet-100 text-violet-800", dot: "bg-violet-500" },
  leave: { label: "Leave taken", chip: "bg-blue-100 text-blue-800", dot: "bg-blue-500" },
  sick: { label: "Sick leave", chip: "bg-rose-100 text-rose-800", dot: "bg-rose-500" },
  wfh: { label: "WFH", chip: "bg-teal-100 text-teal-800", dot: "bg-teal-500" },
  pending: { label: "Pending request", chip: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
};
export const MY_EVENTS: { date: string; type: CalType; label: string }[] = [
  { date: "2026-09-14", type: "leave", label: "Casual leave" },
  { date: "2026-11-05", type: "leave", label: "Casual leave" },
  { date: "2026-11-12", type: "sick", label: "Sick leave" },
  { date: "2026-11-13", type: "sick", label: "Sick leave" },
  { date: "2026-11-16", type: "wfh", label: "WFH" },
  { date: "2026-11-19", type: "wfh", label: "WFH (approved)" },
  { date: "2026-11-24", type: "wfh", label: "WFH (pending)" },
  { date: "2026-12-24", type: "pending", label: "Earned leave" },
  { date: "2026-12-25", type: "pending", label: "Earned leave" },
  { date: "2026-12-26", type: "pending", label: "Earned leave" },
];

// Salary
export type Salary = { id: string; name: string; dept: string; basic: number; hra: number; other: number; fixed: number; unpaid: number };
export const SALARIES: Salary[] = [
  { id: "s1", name: "Priya Deshmukh", dept: "HR", basic: 52000, hra: 20800, other: 8000, fixed: 6440, unpaid: 0 },
  { id: "s2", name: "Rohan Patil", dept: "Engineering", basic: 42000, hra: 16800, other: 6000, fixed: 5240, unpaid: 0 },
  { id: "s3", name: "Sneha Kulkarni", dept: "Design", basic: 38000, hra: 15200, other: 5000, fixed: 4760, unpaid: 0 },
  { id: "s4", name: "Vikram Joshi", dept: "Sales", basic: 30000, hra: 12000, other: 4000, fixed: 3800, unpaid: 1 },
  { id: "s5", name: "Ananya Iyer", dept: "Marketing", basic: 45000, hra: 18000, other: 6500, fixed: 5600, unpaid: 0 },
  { id: "s6", name: "Karan Mehta", dept: "Engineering", basic: 36000, hra: 14400, other: 4500, fixed: 4520, unpaid: 0 },
  { id: "s7", name: "Neha Singh", dept: "Finance", basic: 34000, hra: 13600, other: 4000, fixed: 4280, unpaid: 0 },
  { id: "s8", name: "Rahul Verma", dept: "Support", basic: 26000, hra: 10400, other: 3000, fixed: 3320, unpaid: 2 },
  { id: "s9", name: "Pooja Nair", dept: "HR", basic: 28000, hra: 11200, other: 3500, fixed: 3560, unpaid: 0 },
  { id: "s10", name: "Isha Gupta", dept: "Engineering", basic: 33000, hra: 13200, other: 4000, fixed: 4160, unpaid: 0 },
];
export const WORKING_DAYS = 26;
export const calcPay = (s: Salary) => {
  const gross = s.basic + s.hra + s.other;
  const unpaidDed = Math.round((gross / WORKING_DAYS) * s.unpaid);
  const deductions = s.fixed + unpaidDed;
  return { gross, unpaidDed, deductions, net: gross - deductions };
};

export const PAYSLIPS = [
  { id: "ps4", month: "October 2026", paidOn: "2026-10-31", unpaid: 0 },
  { id: "ps3", month: "September 2026", paidOn: "2026-09-30", unpaid: 0 },
  { id: "ps2", month: "August 2026", paidOn: "2026-08-31", unpaid: 1 },
  { id: "ps1", month: "July 2026", paidOn: "2026-07-31", unpaid: 0 },
];

// Permissions
export const PERMS: { key: string; label: string; module: string; hr: boolean; employee: boolean }[] = [
  { key: "employee.view", label: "View employee list and profiles", module: "Employees", hr: true, employee: false },
  { key: "employee.create", label: "Add employees", module: "Employees", hr: true, employee: false },
  { key: "employee.edit", label: "Edit employee details", module: "Employees", hr: true, employee: false },
  { key: "employee.deactivate", label: "Deactivate employees", module: "Employees", hr: true, employee: false },
  { key: "attendance.view_own", label: "View own attendance", module: "Attendance", hr: true, employee: true },
  { key: "attendance.view_all", label: "View everyone's attendance", module: "Attendance", hr: true, employee: false },
  { key: "attendance.correct", label: "Correct attendance records", module: "Attendance", hr: true, employee: false },
  { key: "wfh.request", label: "Request work from home", module: "Work from home", hr: true, employee: true },
  { key: "wfh.approve", label: "Approve or reject WFH", module: "Work from home", hr: true, employee: false },
  { key: "leave.apply", label: "Apply for leave", module: "Leave", hr: true, employee: true },
  { key: "leave.approve", label: "Approve or reject leave", module: "Leave", hr: true, employee: false },
  { key: "leave.policy_manage", label: "Create and edit leave types", module: "Leave", hr: true, employee: false },
  { key: "holiday.manage", label: "Manage holidays", module: "Leave", hr: true, employee: false },
  { key: "salary.structure_manage", label: "Edit salary structures", module: "Payroll", hr: true, employee: false },
  { key: "payroll.run", label: "Generate payroll", module: "Payroll", hr: true, employee: false },
  { key: "payroll.mark_paid", label: "Mark payroll as paid", module: "Payroll", hr: true, employee: false },
  { key: "payslip.view_own", label: "View own payslips", module: "Payroll", hr: true, employee: true },
];

export type Company = { id: string; name: string; admin: string; email: string; users: number; created: string; status: "Active" | "Suspended" };
export const COMPANIES: Company[] = [
  { id: "c1", name: "Acme Technologies Pvt Ltd", admin: "Aarav Sharma", email: "aarav@acme.com", users: 48, created: "2026-01-12", status: "Active" },
  { id: "c2", name: "Brightpath Logistics", admin: "Meera Rao", email: "meera@brightpath.in", users: 112, created: "2026-02-03", status: "Active" },
  { id: "c3", name: "Nimbus Retail", admin: "Sanjay Bhat", email: "sanjay@nimbusretail.com", users: 64, created: "2026-03-19", status: "Active" },
  { id: "c4", name: "Orbit Labs", admin: "Divya Menon", email: "divya@orbitlabs.io", users: 23, created: "2026-05-08", status: "Active" },
  { id: "c5", name: "Greenfield Foods", admin: "Harish Jain", email: "harish@greenfield.in", users: 210, created: "2026-06-22", status: "Suspended" },
  { id: "c6", name: "Skyline Realty", admin: "Tanvi Shah", email: "tanvi@skyline.co", users: 37, created: "2026-09-04", status: "Active" },
  { id: "c7", name: "Pixel & Pine Studio", admin: "Arjun Das", email: "arjun@pixelpine.com", users: 14, created: "2026-10-15", status: "Active" },
];
export const GROWTH = [
  { m: "Jun", v: 2 }, { m: "Jul", v: 0 }, { m: "Aug", v: 1 }, { m: "Sep", v: 3 }, { m: "Oct", v: 4 }, { m: "Nov", v: 2 },
];

export const AUDIT_COMPANY = [
  { t: "17 Nov 2026, 10:42", who: "Priya Deshmukh", action: "Leave approved", tone: "green", detail: "Karan Mehta, Casual leave, 17 Nov" },
  { t: "17 Nov 2026, 10:15", who: "Priya Deshmukh", action: "WFH rejected", tone: "rose", detail: "Ananya Iyer, 9 Nov (note: team meeting)" },
  { t: "16 Nov 2026, 18:02", who: "Aarav Sharma", action: "Permission changed", tone: "violet", detail: "HR can now run payroll (payroll.run)" },
  { t: "16 Nov 2026, 15:30", who: "Priya Deshmukh", action: "Attendance corrected", tone: "amber", detail: "Vikram Joshi, 13 Nov, check-out set to 18:40" },
  { t: "14 Nov 2026, 11:20", who: "Aarav Sharma", action: "Office IP added", tone: "blue", detail: "Pune Office, 203.0.113.10" },
  { t: "13 Nov 2026, 17:45", who: "Priya Deshmukh", action: "Holiday added", tone: "blue", detail: "Company Annual Day, 20 Nov" },
  { t: "31 Oct 2026, 16:10", who: "Priya Deshmukh", action: "Payroll marked paid", tone: "green", detail: "October 2026, 10 employees" },
  { t: "30 Oct 2026, 12:05", who: "Priya Deshmukh", action: "Payroll generated", tone: "blue", detail: "October 2026" },
  { t: "21 Oct 2026, 09:50", who: "Priya Deshmukh", action: "Employee deactivated", tone: "rose", detail: "Amit Kale (ACM-019)" },
  { t: "12 Oct 2026, 14:30", who: "Aarav Sharma", action: "Employee added", tone: "blue", detail: "Isha Gupta (ACM-052)" },
];
export const AUDIT_PLATFORM = [
  { t: "15 Oct 2026, 10:00", who: "Platform Owner", action: "Company created", tone: "green", detail: "Pixel & Pine Studio, Admin: Arjun Das" },
  { t: "02 Oct 2026, 16:20", who: "Platform Owner", action: "Company suspended", tone: "rose", detail: "Greenfield Foods" },
  { t: "04 Sep 2026, 11:35", who: "Platform Owner", action: "Company created", tone: "green", detail: "Skyline Realty, Admin: Tanvi Shah" },
  { t: "28 Aug 2026, 09:12", who: "Platform Owner", action: "Invite resent", tone: "blue", detail: "Divya Menon, Orbit Labs" },
  { t: "22 Jun 2026, 13:40", who: "Platform Owner", action: "Company created", tone: "green", detail: "Greenfield Foods, Admin: Harish Jain" },
];

// Attendance for the logged-in employee (Nov 1 to 16, 2026), derived by simple rules.
export type DayRow = { date: string; status: "Present" | "Late" | "On leave" | "Weekend" | "Holiday"; mode: "Office" | "WFH" | "-"; in: string; out: string; hours: string; note?: string };
export function myAttendanceNov(): DayRow[] {
  const rows: DayRow[] = [];
  for (let d = 16; d >= 1; d--) {
    const date = `2026-11-${pad(d)}`;
    const wd = parseISO(date).getDay();
    if (wd === 0 || wd === 6) rows.push({ date, status: "Weekend", mode: "-", in: "-", out: "-", hours: "-" });
    else if (d === 8) rows.push({ date, status: "Holiday", mode: "-", in: "-", out: "-", hours: "-", note: "Diwali" });
    else if (d === 5) rows.push({ date, status: "On leave", mode: "-", in: "-", out: "-", hours: "-", note: "Casual leave" });
    else if (d === 12 || d === 13) rows.push({ date, status: "On leave", mode: "-", in: "-", out: "-", hours: "-", note: "Sick leave" });
    else {
      const late = d === 9;
      const inMin = late ? 35 : (d * 7) % 25 + 5;
      const hIn = late ? 10 : 9;
      const outMin = (d * 11) % 40 + 5;
      const worked = 18 * 60 + outMin - (hIn * 60 + inMin);
      rows.push({
        date, status: late ? "Late" : "Present", mode: d === 16 ? "WFH" : "Office",
        in: `${pad(hIn)}:${pad(inMin)}`, out: `18:${pad(outMin)}`,
        hours: `${Math.floor(worked / 60)}h ${pad(worked % 60)}m`,
      });
    }
  }
  return rows;
}
