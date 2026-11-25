"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
} from "lucide-react";
import { Avatar } from "@/components/ui";

export interface DayData {
  day: string;
  date: string;
  label: string;
  isToday: boolean;
  office: number;
  wfh: number;
  leave: number;
  absent: number;
  holiday: number;
  total: number;
  rate: number;
}

export interface WeekAnalyticsData {
  weekNum: number;
  weekLabel: string;
  startDate: string;
  endDate: string;
  offset: number;
  days: DayData[];
  summary: {
    totalOffice: number;
    totalWfh: number;
    totalLeave: number;
    totalAbsent: number;
    headcount: number;
    avgRate: number;
  };
}

export interface MonthWeekData {
  weekIdx: number;
  weekLabel: string;
  dateSpan: string;
  daysCount: number;
  office: number;
  wfh: number;
  leave: number;
  absent: number;
  total: number;
  rate: number;
}

export interface MonthAnalyticsData {
  monthKey: string;
  monthName: string;
  year: number;
  monthNum: number;
  workingDaysCount: number;
  weeks: MonthWeekData[];
  summary: {
    totalOffice: number;
    totalWfh: number;
    totalLeave: number;
    totalAbsent: number;
    headcount: number;
    avgRate: number;
  };
}

export interface EmployeeAnalyticsData {
  id: number;
  name: string;
  code: string;
  dept: string;
  title: string;
  week: {
    days: {
      day: string;
      date: string;
      label: string;
      status: string;
    }[];
    office: number;
    wfh: number;
    leave: number;
    absent: number;
    rate: number;
  };
  month: {
    workingDays: number;
    office: number;
    wfh: number;
    leave: number;
    absent: number;
    rate: number;
  };
}

const FALLBACK_EMPLOYEES: EmployeeAnalyticsData[] = [
  {
    id: 2,
    name: "Aarav Sharma",
    code: "ACM-001",
    dept: "Management",
    title: "Operations Director",
    week: {
      days: [
        { day: "Mon", date: "2026-11-23", label: "23 Nov", status: "Office" },
        { day: "Tue", date: "2026-11-24", label: "24 Nov", status: "Office" },
        { day: "Wed", date: "2026-11-25", label: "25 Nov", status: "Office" },
        { day: "Thu", date: "2026-11-26", label: "26 Nov", status: "Office" },
        { day: "Fri", date: "2026-11-27", label: "27 Nov", status: "Office" },
      ],
      office: 5,
      wfh: 0,
      leave: 0,
      absent: 0,
      rate: 100,
    },
    month: {
      workingDays: 21,
      office: 19,
      wfh: 2,
      leave: 0,
      absent: 0,
      rate: 100,
    },
  },
  {
    id: 3,
    name: "Priya Deshmukh",
    code: "ACM-002",
    dept: "HR",
    title: "HR Lead",
    week: {
      days: [
        { day: "Mon", date: "2026-11-23", label: "23 Nov", status: "Office" },
        { day: "Tue", date: "2026-11-24", label: "24 Nov", status: "Office" },
        { day: "Wed", date: "2026-11-25", label: "25 Nov", status: "WFH" },
        { day: "Thu", date: "2026-11-26", label: "26 Nov", status: "Office" },
        { day: "Fri", date: "2026-11-27", label: "27 Nov", status: "Office" },
      ],
      office: 4,
      wfh: 1,
      leave: 0,
      absent: 0,
      rate: 100,
    },
    month: {
      workingDays: 21,
      office: 17,
      wfh: 3,
      leave: 1,
      absent: 0,
      rate: 95,
    },
  },
  {
    id: 4,
    name: "Rohan Patil",
    code: "ACM-014",
    dept: "Engineering",
    title: "Frontend Engineer",
    week: {
      days: [
        { day: "Mon", date: "2026-11-23", label: "23 Nov", status: "Leave" },
        { day: "Tue", date: "2026-11-24", label: "24 Nov", status: "Leave" },
        { day: "Wed", date: "2026-11-25", label: "25 Nov", status: "Office" },
        { day: "Thu", date: "2026-11-26", label: "26 Nov", status: "Office" },
        { day: "Fri", date: "2026-11-27", label: "27 Nov", status: "Office" },
      ],
      office: 3,
      wfh: 0,
      leave: 2,
      absent: 0,
      rate: 60,
    },
    month: {
      workingDays: 21,
      office: 16,
      wfh: 2,
      leave: 3,
      absent: 0,
      rate: 86,
    },
  },
  {
    id: 15,
    name: "Sneha Kulkarni",
    code: "ACM-021",
    dept: "Design",
    title: "Product Designer",
    week: {
      days: [
        { day: "Mon", date: "2026-11-23", label: "23 Nov", status: "Office" },
        { day: "Tue", date: "2026-11-24", label: "24 Nov", status: "WFH" },
        { day: "Wed", date: "2026-11-25", label: "25 Nov", status: "Office" },
        { day: "Thu", date: "2026-11-26", label: "26 Nov", status: "Office" },
        { day: "Fri", date: "2026-11-27", label: "27 Nov", status: "WFH" },
      ],
      office: 3,
      wfh: 2,
      leave: 0,
      absent: 0,
      rate: 100,
    },
    month: {
      workingDays: 21,
      office: 15,
      wfh: 5,
      leave: 1,
      absent: 0,
      rate: 95,
    },
  },
  {
    id: 16,
    name: "Vikram Joshi",
    code: "ACM-025",
    dept: "Sales",
    title: "Account Executive",
    week: {
      days: [
        { day: "Mon", date: "2026-11-23", label: "23 Nov", status: "Office" },
        { day: "Tue", date: "2026-11-24", label: "24 Nov", status: "Office" },
        { day: "Wed", date: "2026-11-25", label: "25 Nov", status: "Office" },
        { day: "Thu", date: "2026-11-26", label: "26 Nov", status: "Office" },
        { day: "Fri", date: "2026-11-27", label: "27 Nov", status: "Office" },
      ],
      office: 5,
      wfh: 0,
      leave: 0,
      absent: 0,
      rate: 100,
    },
    month: {
      workingDays: 21,
      office: 18,
      wfh: 2,
      leave: 1,
      absent: 0,
      rate: 95,
    },
  },
  {
    id: 17,
    name: "Ananya Iyer",
    code: "ACM-029",
    dept: "Marketing",
    title: "Content Lead",
    week: {
      days: [
        { day: "Mon", date: "2026-11-23", label: "23 Nov", status: "Office" },
        { day: "Tue", date: "2026-11-24", label: "24 Nov", status: "Office" },
        { day: "Wed", date: "2026-11-25", label: "25 Nov", status: "WFH" },
        { day: "Thu", date: "2026-11-26", label: "26 Nov", status: "Office" },
        { day: "Fri", date: "2026-11-27", label: "27 Nov", status: "Office" },
      ],
      office: 4,
      wfh: 1,
      leave: 0,
      absent: 0,
      rate: 100,
    },
    month: {
      workingDays: 21,
      office: 16,
      wfh: 4,
      leave: 1,
      absent: 0,
      rate: 95,
    },
  },
  {
    id: 18,
    name: "Karan Mehta",
    code: "ACM-033",
    dept: "Engineering",
    title: "Backend Engineer",
    week: {
      days: [
        { day: "Mon", date: "2026-11-23", label: "23 Nov", status: "Office" },
        { day: "Tue", date: "2026-11-24", label: "24 Nov", status: "Office" },
        { day: "Wed", date: "2026-11-25", label: "25 Nov", status: "Office" },
        { day: "Thu", date: "2026-11-26", label: "26 Nov", status: "Office" },
        { day: "Fri", date: "2026-11-27", label: "27 Nov", status: "Office" },
      ],
      office: 5,
      wfh: 0,
      leave: 0,
      absent: 0,
      rate: 100,
    },
    month: {
      workingDays: 21,
      office: 18,
      wfh: 2,
      leave: 1,
      absent: 0,
      rate: 95,
    },
  },
  {
    id: 19,
    name: "Neha Singh",
    code: "ACM-038",
    dept: "Finance",
    title: "Finance Analyst",
    week: {
      days: [
        { day: "Mon", date: "2026-11-23", label: "23 Nov", status: "Office" },
        { day: "Tue", date: "2026-11-24", label: "24 Nov", status: "Office" },
        { day: "Wed", date: "2026-11-25", label: "25 Nov", status: "Office" },
        { day: "Thu", date: "2026-11-26", label: "26 Nov", status: "Office" },
        { day: "Fri", date: "2026-11-27", label: "27 Nov", status: "Office" },
      ],
      office: 5,
      wfh: 0,
      leave: 0,
      absent: 0,
      rate: 100,
    },
    month: {
      workingDays: 21,
      office: 19,
      wfh: 1,
      leave: 1,
      absent: 0,
      rate: 95,
    },
  },
  {
    id: 20,
    name: "Rahul Verma",
    code: "ACM-041",
    dept: "Support",
    title: "Support Specialist",
    week: {
      days: [
        { day: "Mon", date: "2026-11-23", label: "23 Nov", status: "Office" },
        { day: "Tue", date: "2026-11-24", label: "24 Nov", status: "Office" },
        { day: "Wed", date: "2026-11-25", label: "25 Nov", status: "WFH" },
        { day: "Thu", date: "2026-11-26", label: "26 Nov", status: "Office" },
        { day: "Fri", date: "2026-11-27", label: "27 Nov", status: "Office" },
      ],
      office: 4,
      wfh: 1,
      leave: 0,
      absent: 0,
      rate: 100,
    },
    month: {
      workingDays: 21,
      office: 17,
      wfh: 3,
      leave: 1,
      absent: 0,
      rate: 95,
    },
  },
  {
    id: 21,
    name: "Pooja Nair",
    code: "ACM-047",
    dept: "HR",
    title: "HR Executive",
    week: {
      days: [
        { day: "Mon", date: "2026-11-23", label: "23 Nov", status: "Office" },
        { day: "Tue", date: "2026-11-24", label: "24 Nov", status: "Office" },
        { day: "Wed", date: "2026-11-25", label: "25 Nov", status: "Office" },
        { day: "Thu", date: "2026-11-26", label: "26 Nov", status: "Office" },
        { day: "Fri", date: "2026-11-27", label: "27 Nov", status: "Office" },
      ],
      office: 5,
      wfh: 0,
      leave: 0,
      absent: 0,
      rate: 100,
    },
    month: {
      workingDays: 21,
      office: 18,
      wfh: 2,
      leave: 1,
      absent: 0,
      rate: 95,
    },
  },
  {
    id: 22,
    name: "Isha Gupta",
    code: "ACM-052",
    dept: "Engineering",
    title: "QA Engineer",
    week: {
      days: [
        { day: "Mon", date: "2026-11-23", label: "23 Nov", status: "Office" },
        { day: "Tue", date: "2026-11-24", label: "24 Nov", status: "Office" },
        { day: "Wed", date: "2026-11-25", label: "25 Nov", status: "Office" },
        { day: "Thu", date: "2026-11-26", label: "26 Nov", status: "Office" },
        { day: "Fri", date: "2026-11-27", label: "27 Nov", status: "Office" },
      ],
      office: 5,
      wfh: 0,
      leave: 0,
      absent: 0,
      rate: 100,
    },
    month: {
      workingDays: 21,
      office: 19,
      wfh: 1,
      leave: 1,
      absent: 0,
      rate: 95,
    },
  },
  {
    id: 24,
    name: "Tejas Mhaske",
    code: "ACM-001",
    dept: "Engineering",
    title: "Software Engineer",
    week: {
      days: [
        { day: "Mon", date: "2026-11-23", label: "23 Nov", status: "Office" },
        { day: "Tue", date: "2026-11-24", label: "24 Nov", status: "Office" },
        { day: "Wed", date: "2026-11-25", label: "25 Nov", status: "Office" },
        { day: "Thu", date: "2026-11-26", label: "26 Nov", status: "Office" },
        { day: "Fri", date: "2026-11-27", label: "27 Nov", status: "Office" },
      ],
      office: 5,
      wfh: 0,
      leave: 0,
      absent: 0,
      rate: 100,
    },
    month: {
      workingDays: 21,
      office: 19,
      wfh: 2,
      leave: 0,
      absent: 0,
      rate: 100,
    },
  },
  {
    id: 26,
    name: "Rishikesh",
    code: "ACM-013",
    dept: "Engineering",
    title: "Senior Developer",
    week: {
      days: [
        { day: "Mon", date: "2026-11-23", label: "23 Nov", status: "Office" },
        { day: "Tue", date: "2026-11-24", label: "24 Nov", status: "Office" },
        { day: "Wed", date: "2026-11-25", label: "25 Nov", status: "Office" },
        { day: "Thu", date: "2026-11-26", label: "26 Nov", status: "Office" },
        { day: "Fri", date: "2026-11-27", label: "27 Nov", status: "Office" },
      ],
      office: 5,
      wfh: 0,
      leave: 0,
      absent: 0,
      rate: 100,
    },
    month: {
      workingDays: 21,
      office: 18,
      wfh: 2,
      leave: 1,
      absent: 0,
      rate: 95,
    },
  },
  {
    id: 27,
    name: "Shivraj",
    code: "ACM-014",
    dept: "Engineering",
    title: "DevOps Engineer",
    week: {
      days: [
        { day: "Mon", date: "2026-11-23", label: "23 Nov", status: "Office" },
        { day: "Tue", date: "2026-11-24", label: "24 Nov", status: "Office" },
        { day: "Wed", date: "2026-11-25", label: "25 Nov", status: "WFH" },
        { day: "Thu", date: "2026-11-26", label: "26 Nov", status: "Office" },
        { day: "Fri", date: "2026-11-27", label: "27 Nov", status: "Office" },
      ],
      office: 4,
      wfh: 1,
      leave: 0,
      absent: 0,
      rate: 100,
    },
    month: {
      workingDays: 21,
      office: 17,
      wfh: 3,
      leave: 1,
      absent: 0,
      rate: 95,
    },
  },
];

interface AttendanceAnalyticsProps {
  initialWeekData?: WeekAnalyticsData;
  initialMonthData?: MonthAnalyticsData;
  initialEmployeeData?: EmployeeAnalyticsData[];
  fallbackWeekSummary?: { d: string; p: number; w: number; l: number; a: number }[];
}

export default function AttendanceAnalytics({
  initialWeekData,
  initialMonthData,
  initialEmployeeData,
  fallbackWeekSummary = [],
}: AttendanceAnalyticsProps) {
  const [view, setView] = useState<"week" | "month" | "employee">("week");
  const [weekData, setWeekData] = useState<WeekAnalyticsData | undefined>(initialWeekData);
  const [monthData, setMonthData] = useState<MonthAnalyticsData | undefined>(initialMonthData);
  const [employeeData, setEmployeeData] = useState<EmployeeAnalyticsData[]>(
    initialEmployeeData && initialEmployeeData.length > 0 ? initialEmployeeData : FALLBACK_EMPLOYEES
  );
  const [weekOffset, setWeekOffset] = useState<number>(initialWeekData?.offset || 0);
  const [currentMonthKey, setCurrentMonthKey] = useState<string>(initialMonthData?.monthKey || "2026-11");
  const [navLoading, setNavLoading] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Sync props when updated asynchronously from parent
  useEffect(() => {
    if (initialWeekData) setWeekData(initialWeekData);
  }, [initialWeekData]);

  useEffect(() => {
    if (initialMonthData) setMonthData(initialMonthData);
  }, [initialMonthData]);

  useEffect(() => {
    if (initialEmployeeData && initialEmployeeData.length > 0) {
      setEmployeeData(initialEmployeeData);
    }
  }, [initialEmployeeData]);

  // Employee-wise filters
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [empPeriod, setEmpPeriod] = useState<"week" | "month">("week");
  const [empPage, setEmpPage] = useState(1);
  const pageSize = 7;

  const fetchAnalytics = async (offset: number, month: string) => {
    setNavLoading(true);
    try {
      const res = await fetch(`/api/admin/dashboard?weekOffset=${offset}&month=${month}`);
      const json = await res.json();
      if (json?.success) {
        if (json.weekData) setWeekData(json.weekData);
        if (json.monthData) setMonthData(json.monthData);
        if (json.employeeData && json.employeeData.length > 0) {
          setEmployeeData(json.employeeData);
        }
      }
    } catch (err) {
      console.error("Failed to load attendance analytics:", err);
    } finally {
      setNavLoading(false);
    }
  };

  useEffect(() => {
    if (!initialEmployeeData || initialEmployeeData.length === 0) {
      fetchAnalytics(weekOffset, currentMonthKey);
    }
  }, []);

  const handleWeekNav = (delta: number) => {
    const newOffset = weekOffset + delta;
    setWeekOffset(newOffset);
    fetchAnalytics(newOffset, currentMonthKey);
  };

  const handleResetCurrentWeek = () => {
    setWeekOffset(0);
    fetchAnalytics(0, currentMonthKey);
  };

  const handleMonthNav = (deltaMonths: number) => {
    const [yStr, mStr] = currentMonthKey.split("-");
    let y = parseInt(yStr || "2026", 10);
    let m = parseInt(mStr || "11", 10) + deltaMonths;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    const newMonthKey = `${y}-${String(m).padStart(2, "0")}`;
    setCurrentMonthKey(newMonthKey);
    fetchAnalytics(weekOffset, newMonthKey);
  };

  const weekDays = weekData?.days || fallbackWeekSummary.map((w, i) => ({
    day: w.d,
    date: `2026-11-${23 + i}`,
    label: `${23 + i} Nov`,
    isToday: i === 1,
    office: w.p,
    wfh: w.w,
    leave: w.l,
    absent: w.a,
    holiday: 0,
    total: w.p + w.w + w.l + w.a || 14,
    rate: Math.round(((w.p + w.w) / Math.max(w.p + w.w + w.l + w.a, 1)) * 100),
  }));

  const departments = ["All", ...Array.from(new Set(employeeData.map((e) => e.dept).filter(Boolean)))];

  const filteredEmployees = employeeData.filter((emp) => {
    const matchesSearch =
      !search.trim() ||
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.code.toLowerCase().includes(search.toLowerCase()) ||
      emp.dept.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === "All" || emp.dept === deptFilter;
    return matchesSearch && matchesDept;
  });

  const totalEmpPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const pagedEmployees = filteredEmployees.slice((empPage - 1) * pageSize, empPage * pageSize);

  return (
    <section className="lg:col-span-3 rounded-xl border border-slate-200/80 bg-white">
      {/* Minimal Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        {/* Title & Navigation */}
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900 tracking-tight">Attendance</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              {view === "week" && (
                <>
                  <span>{weekData?.weekLabel || "Week 48 · 23–27 Nov 2026"}</span>
                  <div className="inline-flex items-center gap-0.5 ml-1">
                    <button
                      type="button"
                      onClick={() => handleWeekNav(-1)}
                      disabled={navLoading}
                      className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition disabled:opacity-30"
                      title="Previous week"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    {weekOffset !== 0 && (
                      <button
                        type="button"
                        onClick={handleResetCurrentWeek}
                        disabled={navLoading}
                        className="text-[11px] font-semibold text-rose-600 hover:underline px-1"
                      >
                        Today
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleWeekNav(1)}
                      disabled={navLoading}
                      className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition disabled:opacity-30"
                      title="Next week"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}

              {view === "month" && (
                <>
                  <span>{monthData?.monthName || "November 2026"}</span>
                  <span className="text-slate-300">·</span>
                  <span>{monthData?.workingDaysCount || 21} working days</span>
                  <div className="inline-flex items-center gap-0.5 ml-1">
                    <button
                      type="button"
                      onClick={() => handleMonthNav(-1)}
                      disabled={navLoading}
                      className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition disabled:opacity-30"
                      title="Previous month"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMonthNav(1)}
                      disabled={navLoading}
                      className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition disabled:opacity-30"
                      title="Next month"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}

              {view === "employee" && (
                <>
                  <span>{employeeData.length} team members</span>
                  <span className="text-slate-300">·</span>
                  <span className="capitalize">{empPeriod} view</span>
                </>
              )}
            </div>
          </div>
          {navLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />}
        </div>

        {/* Legend + View Switcher */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Office
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-400" /> WFH
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-400" /> Leave
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400" /> Absent
            </span>
          </div>

          {/* Minimal View Segmented Control */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setView("week")}
              className={`rounded-md px-2.5 py-1 transition ${
                view === "week"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setView("month")}
              className={`rounded-md px-2.5 py-1 transition ${
                view === "month"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setView("employee")}
              className={`rounded-md px-2.5 py-1 transition ${
                view === "employee"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Employees
            </button>
          </div>
        </div>
      </header>

      {/* VIEW 1: MINIMALIST WEEKLY GRAPH */}
      {view === "week" && (
        <div className="px-6 py-5">
          <div className="flex h-52 items-end justify-between gap-4 sm:gap-8 px-2 sm:px-6">
            {weekDays.map((w, idx) => {
              const sum = Math.max(w.office + w.wfh + w.leave + w.absent, 1);
              const isHovered = hoveredIdx === idx;

              return (
                <div
                  key={w.date}
                  className="relative flex flex-1 flex-col items-center gap-2 group cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Floating Clean Minimal Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-11 z-20 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg animate-in fade-in duration-150">
                      {w.office} office · {w.wfh} wfh · {w.leave} leave · {w.absent} absent
                    </div>
                  )}

                  {/* Percentage label */}
                  <span className={`text-[11px] font-semibold transition ${w.isToday ? "text-rose-600 font-bold" : "text-slate-400 group-hover:text-slate-700"}`}>
                    {w.rate}%
                  </span>

                  {/* Slender Sleek Stacked Bar */}
                  <div
                    className={`flex w-full max-w-8 flex-col-reverse overflow-hidden rounded-t-md bg-slate-100 transition-all ${
                      isHovered ? "ring-2 ring-slate-400/50 scale-102" : ""
                    }`}
                    style={{ height: "150px" }}
                  >
                    <div
                      style={{ height: `${(w.office / sum) * 100}%` }}
                      className="bg-emerald-500"
                    />
                    <div
                      style={{ height: `${(w.wfh / sum) * 100}%` }}
                      className="bg-teal-400"
                    />
                    <div
                      style={{ height: `${(w.leave / sum) * 100}%` }}
                      className="bg-indigo-400"
                    />
                    <div
                      style={{ height: `${(w.absent / sum) * 100}%` }}
                      className="bg-rose-400"
                    />
                  </div>

                  {/* Day + Date */}
                  <div className="flex flex-col items-center text-center">
                    <span className={`text-xs ${w.isToday ? "font-bold text-rose-600" : "font-medium text-slate-700"}`}>
                      {w.day}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {w.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: MINIMALIST MONTHLY GRAPH */}
      {view === "month" && (
        <div className="px-6 py-5">
          <div className="flex h-52 items-end justify-between gap-4 sm:gap-8 px-2 sm:px-6">
            {(monthData?.weeks || []).map((w, idx) => {
              const sum = Math.max(w.office + w.wfh + w.leave + w.absent, 1);
              const isHovered = hoveredIdx === idx;

              return (
                <div
                  key={w.weekIdx}
                  className="relative flex flex-1 flex-col items-center gap-2 group cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Floating Clean Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-11 z-20 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg animate-in fade-in duration-150">
                      {w.office} office · {w.wfh} wfh · {w.leave} leave · {w.absent} absent
                    </div>
                  )}

                  {/* Percentage label */}
                  <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-700 transition">
                    {w.rate}%
                  </span>

                  {/* Slender Sleek Stacked Bar */}
                  <div
                    className={`flex w-full max-w-10 flex-col-reverse overflow-hidden rounded-t-md bg-slate-100 transition-all ${
                      isHovered ? "ring-2 ring-slate-400/50 scale-102" : ""
                    }`}
                    style={{ height: "150px" }}
                  >
                    <div
                      style={{ height: `${(w.office / sum) * 100}%` }}
                      className="bg-emerald-500"
                    />
                    <div
                      style={{ height: `${(w.wfh / sum) * 100}%` }}
                      className="bg-teal-400"
                    />
                    <div
                      style={{ height: `${(w.leave / sum) * 100}%` }}
                      className="bg-indigo-400"
                    />
                    <div
                      style={{ height: `${(w.absent / sum) * 100}%` }}
                      className="bg-rose-400"
                    />
                  </div>

                  {/* Week label & dates */}
                  <div className="flex flex-col items-center text-center">
                    <span className="text-xs font-medium text-slate-700">
                      {w.weekLabel}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {w.dateSpan}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: MINIMALIST EMPLOYEE DIRECTORY */}
      {view === "employee" && (
        <div className="p-4 sm:p-5">
          {/* Subtle Controls */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setEmpPage(1);
                  }}
                  placeholder="Filter employees..."
                  className="w-full rounded-md border border-slate-200 bg-white py-1 pl-8 pr-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  setEmpPage(1);
                }}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-rose-500 focus:outline-hidden"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setEmpPeriod("week")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    empPeriod === "week" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Week
                </button>
                <button
                  type="button"
                  onClick={() => setEmpPeriod("month")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    empPeriod === "month" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Month
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          {filteredEmployees.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching employees found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="py-2 px-3">Employee</th>
                    {empPeriod === "week" && <th className="py-2 px-3">Status</th>}
                    <th className="py-2 px-2 text-center text-emerald-600 font-semibold">Office</th>
                    <th className="py-2 px-2 text-center text-teal-600 font-semibold">WFH</th>
                    <th className="py-2 px-2 text-center text-indigo-600 font-semibold">Leave</th>
                    <th className="py-2 px-2 text-center text-rose-600 font-semibold">Absent</th>
                    <th className="py-2 px-3 text-right">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {pagedEmployees.map((emp) => {
                    const stats = empPeriod === "week" ? emp.week : emp.month;
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={emp.name} size={24} />
                            <div>
                              <span className="font-medium text-slate-900">{emp.name}</span>
                              <span className="ml-1.5 text-[11px] text-slate-400 font-mono">{emp.code}</span>
                            </div>
                          </div>
                        </td>

                        {empPeriod === "week" && (
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1">
                              {emp.week.days.map((d) => {
                                const dot =
                                  d.status === "Office"
                                    ? "bg-emerald-500"
                                    : d.status === "WFH"
                                    ? "bg-teal-400"
                                    : d.status === "Leave"
                                    ? "bg-indigo-400"
                                    : "bg-rose-400";
                                return (
                                  <span
                                    key={d.date}
                                    title={`${d.day}: ${d.status}`}
                                    className={`h-2 w-2 rounded-full ${dot}`}
                                  />
                                );
                              })}
                            </div>
                          </td>
                        )}

                        <td className="py-2 px-2 text-center font-mono">{stats.office}</td>
                        <td className="py-2 px-2 text-center font-mono">{stats.wfh}</td>
                        <td className="py-2 px-2 text-center font-mono">{stats.leave}</td>
                        <td className="py-2 px-2 text-center font-mono">{stats.absent}</td>

                        <td className="py-2 px-3 text-right">
                          <span
                            className={`font-semibold font-mono text-[11px] ${
                              stats.rate >= 80 ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            {stats.rate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {totalEmpPages > 1 && (
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                  <span>
                    {(empPage - 1) * pageSize + 1}–{Math.min(empPage * pageSize, filteredEmployees.length)} of {filteredEmployees.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEmpPage((p) => Math.max(1, p - 1))}
                      disabled={empPage === 1}
                      className="px-2 py-0.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                    >
                      Prev
                    </button>
                    <span className="px-1 text-slate-600 font-medium">
                      {empPage}/{totalEmpPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEmpPage((p) => Math.min(totalEmpPages, p + 1))}
                      disabled={empPage === totalEmpPages}
                      className="px-2 py-0.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
