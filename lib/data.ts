export const companies = [
  { name: "Sahyadri Logistics", admin: "Meera Joshi", users: 26, status: "Active", since: "12 Aug 2026" },
  { name: "Bluepeak Studios", admin: "Karan Mehta", users: 14, status: "Active", since: "29 Aug 2026" },
  { name: "Greenfield Clinics", admin: "Dr. Nisha Rao", users: 48, status: "Active", since: "03 Sep 2026" },
  { name: "Orbit Retail", admin: "Sameer Shaikh", users: 9, status: "Suspended", since: "21 Sep 2026" },
  { name: "Kaveri Foods", admin: "Lata Iyer", users: 31, status: "Active", since: "05 Oct 2026" },
];

export const employees = [
  { code: "EMP-001", name: "Ananya Kulkarni", dept: "Operations", title: "Operations Lead", today: "Office", status: "Active" },
  { code: "EMP-002", name: "Rohan Desai", dept: "People", title: "HR Manager", today: "Office", status: "Active" },
  { code: "EMP-003", name: "Vikram Patil", dept: "Finance", title: "Accountant", today: "WFH", status: "Active" },
  { code: "EMP-004", name: "Sneha Pawar", dept: "Sales", title: "Account Executive", today: "On leave", status: "Active" },
  { code: "EMP-005", name: "Aditya Bhosale", dept: "Operations", title: "Dispatch Coordinator", today: "Office", status: "Active" },
  { code: "EMP-006", name: "Pooja Nair", dept: "Sales", title: "Sales Associate", today: "Absent", status: "Active" },
  { code: "EMP-007", name: "Imran Sayyed", dept: "IT", title: "Support Engineer", today: "Office", status: "Inactive" },
];

export const leaveRequests = [
  { who: "Sneha Pawar", type: "Casual", dates: "17–18 Nov", days: 2, reason: "Family function" },
  { who: "Aditya Bhosale", type: "Sick", dates: "20 Nov", days: 0.5, reason: "Dental appointment" },
  { who: "Pooja Nair", type: "Paid", dates: "23–27 Nov", days: 5, reason: "Travel" },
];

export const wfhRequests = [
  { who: "Vikram Patil", dates: "18 Nov", reason: "Plumber visit at home" },
  { who: "Ananya Kulkarni", dates: "25 Nov", reason: "Internet provider maintenance at office" },
];

export const holidays = [
  { date: "Tue 24 Nov", name: "Guru Nanak Jayanti" },
  { date: "Fri 25 Dec", name: "Christmas" },
];

export const payroll = [
  { name: "Ananya Kulkarni", basic: 52000, allow: 14000, ded: 2400, unpaid: 0, status: "Draft" },
  { name: "Vikram Patil", basic: 41000, allow: 9000, ded: 1800, unpaid: 1, status: "Draft" },
  { name: "Sneha Pawar", basic: 36000, allow: 7500, ded: 1500, unpaid: 0, status: "Draft" },
  { name: "Aditya Bhosale", basic: 28000, allow: 5000, ded: 1200, unpaid: 2, status: "Draft" },
  { name: "Pooja Nair", basic: 30000, allow: 5500, ded: 1200, unpaid: 0, status: "Draft" },
];

export const attendance = [
  { date: "Tue 17 Nov", in: "09:42", out: "—", mode: "Office", status: "Present" },
  { date: "Mon 16 Nov", in: "10:21", out: "18:35", mode: "Office", status: "Late" },
  { date: "Fri 13 Nov", in: "09:30", out: "18:10", mode: "Office", status: "Present" },
  { date: "Thu 12 Nov", in: "09:36", out: "18:02", mode: "WFH", status: "WFH" },
  { date: "Wed 11 Nov", in: "—", out: "—", mode: "—", status: "On leave" },
  { date: "Tue 10 Nov", in: "09:28", out: "13:30", mode: "Office", status: "Half-day" },
  { date: "Mon 09 Nov", in: "09:33", out: "18:20", mode: "Office", status: "Present" },
];

export const leaveHistory = [
  { type: "Casual", dates: "11 Nov", days: 1, status: "Approved" },
  { type: "Sick", dates: "02–03 Oct", days: 2, status: "Approved" },
  { type: "Paid", dates: "28 Nov", days: 1, status: "Pending" },
];

export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
