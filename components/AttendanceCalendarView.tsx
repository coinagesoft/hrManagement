"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  LayoutGrid,
  Columns,
  Loader2,
  Pencil,
  Search,
  Users,
  Layers,
  Calendar as CalendarIcon,
  AlertCircle,
} from "lucide-react";
import { Avatar, Badge, Btn, Card, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui";
import { Field, Modal, inputCls, useToast } from "@/components/interactive";
import { DAYS_SHORT, MONTHS, pad } from "@/lib/dates";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/cn";
import {
  calculateSandwichBlocks,
  type SandwichDateInfo,
  type SandwichBlock,
} from "@/lib/sandwich";

interface Holiday {
  id: number;
  name: string;
  date: string;
  kind: string;
}

interface LeaveMarker {
  id: number;
  userId: number;
  name: string;
  from: string;
  to: string;
  type: string;
  status: string;
}

interface WfhMarker {
  id: number;
  userId: number;
  name: string;
  date: string;
  reason: string;
  status: string;
}

interface AttendanceStat {
  date: string;
  present: number;
  late: number;
  wfh: number;
}

interface TeamRow {
  userId: number;
  code: string;
  name: string;
  dept: string;
  title: string;
  status: string;
  mode: string;
  in: string;
  out: string;
  hoursFormatted?: string;
  hoursDecimal?: number;
  ip: string;
  leaveReason?: string | null;
  leaveType?: string | null;
}

function formatSelectedDay(s: string) {
  if (!s) return "";
  const [y, m, d] = s.split("-").map(Number);
  const dayName = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][new Date(y, m - 1, d).getDay()];
  const monthName = MONTHS[m - 1] || "";
  return `${dayName}, ${d} ${monthName} ${y}`;
}

export default function AttendanceCalendarView() {
  const role = useRole();
  const toast = useToast();
  const apiAttendanceBase = role === "hr" ? "/api/hr/attendance" : "/api/admin/attendance";

  // Mode: "split" = Interactive Split View, "full" = Full Month Calendar View
  const [viewMode, setViewMode] = useState<"split" | "full">("split");

  // Current calendar view (0-indexed month)
  const [ym, setYm] = useState({ y: 2026, m: 10 }); // 10 = Nov
  const [selectedDate, setSelectedDate] = useState("2026-11-20");

  // Data
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [sandwichBlocks, setSandwichBlocks] = useState<SandwichBlock[]>([]);
  const [sandwichDateMap, setSandwichDateMap] = useState<Map<string, SandwichDateInfo>>(new Map());
  const [monthLeaves, setMonthLeaves] = useState<LeaveMarker[]>([]);
  const [monthWfhs, setMonthWfhs] = useState<WfhMarker[]>([]);
  const [monthStats, setMonthStats] = useState<AttendanceStat[]>([]);
  const [roster, setRoster] = useState<TeamRow[]>([]);

  // Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Pagination for Daily Attendance Roster
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(7); // 7 items fits neatly alongside mini calendar

  // Correction Modal & Form Validation
  const [correcting, setCorrecting] = useState<TeamRow | null>(null);
  const [correctForm, setCorrectForm] = useState({ checkIn: "09:30", checkOut: "18:30", reason: "" });
  const [correctErrors, setCorrectErrors] = useState<{ checkIn?: string; checkOut?: string; reason?: string }>({});
  const [savingCorrection, setSavingCorrection] = useState(false);

  // Initialize today's date safely in useEffect
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
    const [y, m] = today.split("-").map(Number);
    setYm({ y, m: m - 1 });
  }, []);

  // Reset pagination to page 1 whenever date, search query, or status filter changes
  useEffect(() => {
    setPage(1);
  }, [selectedDate, searchQuery, statusFilter, pageSize]);

  // Fetch month calendar events (holidays, leaves, wfh, attendance stats, sandwich blocks)
  const fetchMonthEvents = async (year: number, monthIndex: number) => {
    setLoadingCalendar(true);
    try {
      const res = await fetch(`/api/hr/calendar?year=${year}&month=${monthIndex + 1}`);
      const json = await res.json();
      if (json?.success) {
        const hols = json.holidays || [];
        setHolidays(hols);

        const { blocks: sBlocks, dateMap: sMap } = calculateSandwichBlocks(hols, year);
        setSandwichBlocks(sBlocks);
        setSandwichDateMap(sMap);

        setMonthLeaves(
          (json.leaves || []).map((l: any) => ({
            id: l.id,
            userId: l.userId,
            name: l.name,
            from: l.from,
            to: l.to,
            type: l.type,
            status: l.status,
          }))
        );
        setMonthWfhs(
          (json.wfh || []).map((w: any) => ({
            id: w.id,
            userId: w.userId,
            name: w.employee_name || "Employee",
            date: w.date,
            reason: w.reason,
            status: w.status,
          }))
        );
        setMonthStats(json.attendanceStats || []);
      }
    } catch (err) {
      console.error("Failed to load month calendar events:", err);
    } finally {
      setLoadingCalendar(false);
    }
  };

  // Fetch attendance roster for the selected date
  const fetchDateRoster = async (dateStr: string) => {
    setLoadingRoster(true);
    try {
      const res = await fetch(`${apiAttendanceBase}?date=${dateStr}`);
      const data = await res.json();
      if (data?.success && data?.roster) {
        setRoster(data.roster);
      } else {
        setRoster([]);
      }
    } catch (err) {
      console.error("Failed to load attendance roster:", err);
      setRoster([]);
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    fetchMonthEvents(ym.y, ym.m);
  }, [ym.y, ym.m]);

  useEffect(() => {
    if (selectedDate) {
      fetchDateRoster(selectedDate);
    }
  }, [selectedDate]);

  // Calendar calculations
  const firstDayOfWeek = new Date(ym.y, ym.m, 1).getDay(); // 0 = Sun
  const totalDaysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();

  const handlePrevMonth = () => {
    if (ym.m === 0) setYm({ y: ym.y - 1, m: 11 });
    else setYm({ y: ym.y, m: ym.m - 1 });
  };

  const handleNextMonth = () => {
    if (ym.m === 11) setYm({ y: ym.y + 1, m: 0 });
    else setYm({ y: ym.y, m: ym.m + 1 });
  };

  const handleJumpToday = () => {
    const today = new Date().toISOString().split("T")[0];
    const [y, m] = today.split("-").map(Number);
    setYm({ y, m: m - 1 });
    setSelectedDate(today);
  };

  // Export full month attendance to CSV
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${apiAttendanceBase}?export=true&year=${ym.y}&monthNum=${ym.m + 1}`);
      const data = await res.json();
      if (!data?.success || !data?.records) {
        throw new Error("No attendance records found for this month");
      }

      const records = data.records;
      if (records.length === 0) {
        toast(`No attendance records found for ${MONTHS[ym.m]} ${ym.y}`);
        return;
      }

      const headers = [
        "Date",
        "Employee Code",
        "Employee Name",
        "Department",
        "Designation",
        "Check In",
        "Check Out",
        "Work Mode",
        "Status",
        "Network IP",
        "Notes",
      ];

      const rows = records.map((r: any) => [
        r.date,
        `"${(r.employeeCode || "").replace(/"/g, '""')}"`,
        `"${(r.name || "").replace(/"/g, '""')}"`,
        `"${(r.dept || "").replace(/"/g, '""')}"`,
        `"${(r.title || "").replace(/"/g, '""')}"`,
        r.checkIn || "-",
        r.checkOut || "-",
        r.mode || "Office",
        r.status || "Present",
        r.ip || "-",
        `"${(r.notes || "").replace(/"/g, '""')}"`,
      ]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row: string[]) => row.join(","))].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Attendance_${MONTHS[ym.m]}_${ym.y}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast(`Exported ${records.length} records for ${MONTHS[ym.m]} ${ym.y} to Excel`);
    } catch (err: any) {
      toast(err.message || "Failed to export attendance");
    } finally {
      setExporting(false);
    }
  };

  // Get day metadata
  const getDayMeta = (dayNum: number) => {
    const dateStr = `${ym.y}-${pad(ym.m + 1)}-${pad(dayNum)}`;
    const dayHolidays = holidays.filter((h) => h.date === dateStr);
    const dayLeaves = monthLeaves.filter((l) => l.status === "Approved" && dateStr >= l.from && dateStr <= l.to);
    const dayWfhs = monthWfhs.filter((w) => w.status === "Approved" && w.date === dateStr);
    const dayStat = monthStats.find((s) => s.date === dateStr);
    const sandwich = sandwichDateMap.get(dateStr);
    return {
      dateStr,
      hasHoliday: dayHolidays.length > 0,
      holidays: dayHolidays,
      hasLeave: dayLeaves.length > 0,
      leaves: dayLeaves,
      hasWfh: dayWfhs.length > 0,
      wfhs: dayWfhs,
      stat: dayStat,
      sandwich,
    };
  };

  // Filtered roster rows
  const filteredRoster = roster.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.dept.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "WFH" ? r.mode === "WFH" : r.status === statusFilter);
    return matchesSearch && matchesStatus;
  });

  const countBy = (st: string) => roster.filter((r) => r.status === st).length;
  const wfhCount = roster.filter((r) => r.mode === "WFH").length;

  // Pagination calculation
  const totalItems = filteredRoster.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRoster = filteredRoster.slice(startIndex, startIndex + pageSize);

  // Validate form fields for attendance correction
  const validateCorrectionForm = (): boolean => {
    const errs: { checkIn?: string; checkOut?: string; reason?: string } = {};

    if (!correctForm.checkIn || !correctForm.checkIn.trim()) {
      errs.checkIn = "Check-in time is required.";
    }

    if (!correctForm.checkOut || !correctForm.checkOut.trim()) {
      errs.checkOut = "Check-out time is required.";
    }

    if (correctForm.checkIn && correctForm.checkOut) {
      const [inH, inM] = correctForm.checkIn.split(":").map(Number);
      const [outH, outM] = correctForm.checkOut.split(":").map(Number);
      const inMinutes = inH * 60 + inM;
      const outMinutes = outH * 60 + outM;

      if (outMinutes <= inMinutes) {
        errs.checkOut = "Check-out time must be later than check-in time.";
      }
    }

    if (!correctForm.reason || !correctForm.reason.trim()) {
      errs.reason = "Adjustment reason is required.";
    } else if (correctForm.reason.trim().length < 4) {
      errs.reason = "Reason must be at least 4 characters.";
    }

    setCorrectErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveCorrection = async () => {
    if (!correcting) return;
    if (!validateCorrectionForm()) {
      toast("Please fix the validation errors before saving.", "warning");
      return;
    }

    setSavingCorrection(true);
    try {
      const res = await fetch(apiAttendanceBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: correcting.userId,
          date: selectedDate,
          checkIn: correctForm.checkIn.trim(),
          checkOut: correctForm.checkOut.trim(),
          notes: correctForm.reason.trim(),
          status: "Present",
          mode: correcting.mode === "-" ? "Office" : correcting.mode,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Failed to update attendance");

      toast("Punch time corrected and logged in audit trail", "success");
      setCorrecting(null);
      setCorrectErrors({});
      await fetchDateRoster(selectedDate);
    } catch (err: any) {
      toast(err.message || "Failed to save correction", "error");
    } finally {
      setSavingCorrection(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <>
      <PageHeader
        title="Attendance & Calendar"
        desc="Daily employee roster, interactive company calendar, and monthly attendance logs."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle Pill */}
            <div className="inline-flex rounded-lg border border-line bg-canvas p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition cursor-pointer",
                  viewMode === "split"
                    ? "bg-white text-ink shadow-2xs font-semibold"
                    : "text-mute hover:text-ink hover:bg-white/50"
                )}
              >
                <Columns className="h-3.5 w-3.5 text-mute" />
                <span>Roster & Mini</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("full")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition cursor-pointer",
                  viewMode === "full"
                    ? "bg-white text-ink shadow-2xs font-semibold"
                    : "text-mute hover:text-ink hover:bg-white/50"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5 text-mute" />
                <span>Full Calendar</span>
              </button>
            </div>

            {/* Export to Excel */}
            <Btn
              variant="outline"
              icon={exporting ? Loader2 : Download}
              onClick={handleExportExcel}
              disabled={exporting}
              className="text-xs font-medium"
            >
              {exporting ? "Preparing..." : "Export CSV"}
            </Btn>
          </div>
        }
      />

      {/* VIEW MODE 1: Split View (Interactive Mini Calendar + Daily Roster) */}
      {viewMode === "split" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Interactive Mini Calendar & Holidays */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-4 sm:p-5">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-3.5">
                <span className="font-semibold text-ink text-sm tracking-tight">
                  {MONTHS[ym.m]} {ym.y}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-md border border-line text-mute hover:text-ink hover:bg-canvas transition cursor-pointer"
                    title="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleJumpToday}
                    className="px-2 py-1 text-xs font-medium rounded-md border border-line text-mute hover:text-ink hover:bg-canvas transition cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-md border border-line text-mute hover:text-ink hover:bg-canvas transition cursor-pointer"
                    title="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Days of Week Header */}
              <div className="grid grid-cols-7 text-center mb-1">
                {DAYS_SHORT.map((d) => (
                  <span key={d} className="text-[11px] font-medium text-mute py-1">
                    {d}
                  </span>
                ))}
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-9" />
                ))}

                {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const { dateStr, hasHoliday, hasLeave, holidays: dayHols, sandwich } = getDayMeta(dayNum);
                  const isSelected = selectedDate === dateStr;
                  const isToday = todayStr === dateStr;
                  const isSandwich = Boolean(sandwich?.isSandwich);
                  const isSandwichWorkday = sandwich?.role === "sandwich_workday";

                  let cellClass = "text-ink hover:bg-canvas";
                  if (isSelected) {
                    cellClass = "bg-pine text-white font-bold shadow-xs";
                  } else if (isSandwichWorkday) {
                    cellClass = "bg-amber-50 text-amber-950 font-bold border border-dashed border-amber-300 hover:bg-amber-100/70";
                  } else if (isToday) {
                    cellClass = "ring-1 ring-pine/40 font-bold text-pine bg-pine-soft/40 hover:bg-pine-soft";
                  }

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setSelectedDate(dateStr)}
                      title={
                        sandwich?.reason ||
                        (hasHoliday ? dayHols.map((h) => h.name).join(", ") : undefined)
                      }
                      className={cn(
                        "h-9 w-full rounded-lg text-xs font-medium relative flex flex-col items-center justify-center transition cursor-pointer",
                        cellClass
                      )}
                    >
                      <span className="flex items-center gap-0.5 leading-none">
                        {dayNum}
                        {isSandwichWorkday && !isSelected && (
                          <Layers className="h-2.5 w-2.5 text-amber-700 shrink-0" />
                        )}
                      </span>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {hasHoliday && (
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              isSelected ? "bg-white" : "bg-purple-600"
                            )}
                          />
                        )}
                        {hasLeave && (
                          <span
                            className={cn(
                              "h-1 w-1 rounded-full",
                              isSelected ? "bg-white" : "bg-blue-500"
                            )}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Minimal Legend */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-3 border-t border-line text-[11px] text-mute">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-pine" /> Selected
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-600" /> Holiday
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" /> Leave
                </span>
                <span className="flex items-center gap-1 text-amber-900 font-medium">
                  <Layers className="h-2.5 w-2.5 text-amber-700" /> Sandwich
                </span>
              </div>
            </Card>

            {/* Month Holidays - Compact & Clean */}
            {(() => {
              const currentMonthHolidays = holidays.filter((h) =>
                h.date.startsWith(`${ym.y}-${pad(ym.m + 1)}`)
              );
              if (currentMonthHolidays.length === 0) return null;
              return (
                <Card className="p-3.5 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-ink">
                      Holidays in {MONTHS[ym.m]}
                    </span>
                    <span className="text-[11px] text-mute font-medium">
                      {currentMonthHolidays.length} scheduled
                    </span>
                  </div>
                  <ul className="divide-y divide-line text-xs">
                    {currentMonthHolidays.map((h) => (
                      <li key={h.id} className="py-2 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-ink">{h.name}</p>
                          <span className="text-[11px] text-mute">{h.kind} Holiday</span>
                        </div>
                        <span className="font-mono text-[11px] bg-canvas px-2 py-0.5 rounded text-mute border border-line">
                          {h.date}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })()}
          </div>

          {/* Right Column: Attendance Roster for Selected Day */}
          <div className="lg:col-span-7">
            <Card>
              {/* Header with Date, Search & Quick Filter Chips */}
              <div className="p-4 sm:p-5 border-b border-line space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-ink text-sm">
                      {formatSelectedDay(selectedDate)}
                    </h3>
                    <p className="text-xs text-mute mt-0.5">
                      {roster.length} {roster.length === 1 ? "member" : "members"} on company roster
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative w-44 sm:w-56">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-mute" />
                      <input
                        className={`${inputCls} !py-1 !pl-8 text-xs`}
                        placeholder="Search employee..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Interactive Status Filter Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {[
                    { label: "All", count: roster.length },
                    { label: "Present", count: countBy("Present") },
                    { label: "Late", count: countBy("Late") },
                    { label: "On leave", count: countBy("On leave") },
                    { label: "WFH", count: wfhCount },
                    { label: "Absent", count: countBy("Absent") },
                  ].map((chip) => {
                    const isActive = statusFilter === chip.label;
                    return (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => setStatusFilter(chip.label)}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5",
                          isActive
                            ? "bg-pine text-white shadow-2xs font-semibold"
                            : "bg-canvas text-mute hover:text-ink hover:bg-line/70"
                        )}
                      >
                        <span>{chip.label}</span>
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.2 rounded-full",
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-white text-ink/70 border border-line"
                          )}
                        >
                          {chip.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Attendance Table */}
              {loadingRoster ? (
                <div className="flex items-center justify-center p-14 text-mute text-xs">
                  <Loader2 className="h-4 w-4 animate-spin mr-2 text-pine" /> Loading attendance roster...
                </div>
              ) : filteredRoster.length === 0 ? (
                <div className="p-12 text-center text-mute text-xs">
                  <Clock className="h-8 w-8 mx-auto text-line mb-2" />
                  <p className="font-medium text-ink">No attendance records found</p>
                  <p className="text-[11px] text-mute mt-1">
                    No records match your search or filter for {selectedDate}.
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <thead>
                      <tr>
                        <Th>Employee</Th>
                        <Th>Check In</Th>
                        <Th>Check Out</Th>
                        <Th>Hours</Th>
                        <Th>Mode</Th>
                        <Th>Status</Th>
                        <Th className="text-right">Action</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRoster.map((r) => (
                        <tr key={r.userId}>
                          <Td>
                            <div className="flex items-center gap-2.5">
                              <Avatar name={r.name} />
                              <div>
                                <p className="font-medium text-ink text-xs">{r.name}</p>
                                <p className="text-[11px] text-mute">
                                  {r.code} · {r.dept}
                                </p>
                              </div>
                            </div>
                          </Td>
                          <Td className="font-mono text-xs text-ink">{r.in}</Td>
                          <Td className="font-mono text-xs text-ink">{r.out}</Td>
                          <Td className="font-mono text-xs font-semibold text-ink">
                            {r.hoursFormatted && r.hoursFormatted !== "-" ? r.hoursFormatted : "—"}
                          </Td>
                          <Td>
                            {r.mode === "-" ? (
                              <span className="text-mute text-xs">—</span>
                            ) : (
                              <Badge tone={r.mode === "WFH" ? "teal" : "blue"}>{r.mode}</Badge>
                            )}
                          </Td>
                          <Td>
                            <div className="flex flex-col gap-0.5">
                              <StatusBadge s={r.status} />
                              {r.status === "On leave" && r.leaveReason && (
                                <span className="text-[10px] text-mute truncate max-w-[120px]" title={r.leaveReason}>
                                  {r.leaveReason}
                                </span>
                              )}
                            </div>
                          </Td>
                          <Td className="text-right">
                            <Btn
                              size="sm"
                              variant="ghost"
                              icon={Pencil}
                              onClick={() => {
                                setCorrecting(r);
                                setCorrectErrors({});
                                setCorrectForm({
                                  checkIn: r.in === "-" ? "09:30" : r.in,
                                  checkOut: r.out === "-" ? "18:30" : r.out,
                                  reason: "",
                                });
                              }}
                            >
                              Adjust
                            </Btn>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>

                  {/* Clean Pagination Bar */}
                  {totalItems > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-line text-xs text-mute bg-canvas/30">
                      <div className="flex items-center gap-3">
                        <span>
                          Showing <span className="font-semibold text-ink">{startIndex + 1}</span>–
                          <span className="font-semibold text-ink">
                            {Math.min(startIndex + pageSize, totalItems)}
                          </span>{" "}
                          of <span className="font-semibold text-ink">{totalItems}</span>
                        </span>
                        <div className="flex items-center gap-1.5 pl-2 border-l border-line">
                          <span>Rows:</span>
                          <select
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                            className="rounded border border-line bg-white px-2 py-0.5 text-xs text-ink cursor-pointer focus:outline-pine"
                          >
                            <option value={5}>5</option>
                            <option value={7}>7</option>
                            <option value={10}>10</option>
                            <option value={15}>15</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-2.5 py-1 rounded border border-line bg-white text-ink text-xs font-medium hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                        >
                          Previous
                        </button>
                        <span className="px-2 font-medium text-ink">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-2.5 py-1 rounded border border-line bg-white text-ink text-xs font-medium hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: Full Month Calendar Grid */}
      {viewMode === "full" && (
        <Card className="p-4 sm:p-5 space-y-4">
          {/* Calendar Month Header & Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3.5">
            <div>
              <h2 className="text-base font-semibold text-ink">
                {MONTHS[ym.m]} {ym.y}
              </h2>
              <p className="text-xs text-mute mt-0.5">
                Overview of holidays, leaves, and attendance stats. Click any day to inspect its daily roster.
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-md border border-line text-mute hover:text-ink hover:bg-canvas transition cursor-pointer"
                title="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleJumpToday}
                className="px-2.5 py-1 text-xs font-medium rounded-md border border-line text-mute hover:text-ink hover:bg-canvas transition cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-md border border-line text-mute hover:text-ink hover:bg-canvas transition cursor-pointer"
                title="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Full Grid Day Headers */}
          <div className="grid grid-cols-7 border-b border-line text-center font-medium text-xs text-mute py-2">
            {DAYS_SHORT.map((d) => (
              <span key={d} className="uppercase tracking-wider text-[11px]">
                {d}
              </span>
            ))}
          </div>

          {/* Full Month Grid Cells */}
          <div className="grid grid-cols-7 gap-px bg-line border border-line rounded-lg overflow-hidden">
            {/* Empty leading cells */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`full-empty-${i}`} className="min-h-24 bg-canvas/40 p-2" />
            ))}

            {/* Days of the month */}
            {Array.from({ length: totalDaysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const { dateStr, holidays: dayHols, leaves: dayLvs, wfhs: dayWfhs, stat, sandwich } = getDayMeta(dayNum);
              const isSelected = selectedDate === dateStr;
              const isSandwich = Boolean(sandwich?.isSandwich);
              const isSandwichWorkday = sandwich?.role === "sandwich_workday";

              return (
                <div
                  key={`full-${dateStr}`}
                  onClick={() => {
                    setSelectedDate(dateStr);
                    setViewMode("split");
                  }}
                  className={cn(
                    "min-h-24 p-2 flex flex-col justify-between transition cursor-pointer group bg-white",
                    isSelected
                      ? "ring-2 ring-inset ring-pine bg-pine-soft/20"
                      : isSandwichWorkday
                      ? "bg-amber-50/70 border border-dashed border-amber-300 hover:bg-amber-100/60"
                      : "hover:bg-canvas"
                  )}
                >
                  {/* Day number header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "h-5 w-5 rounded-full flex items-center justify-center text-xs font-semibold",
                          isSelected
                            ? "bg-pine text-white"
                            : isSandwichWorkday
                            ? "bg-amber-600 text-white font-bold"
                            : "text-ink group-hover:bg-line/60"
                        )}
                      >
                        {dayNum}
                      </span>
                      {isSandwichWorkday && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 border border-amber-300 px-1 py-0.2 text-[9px] font-bold text-amber-950">
                          <Layers className="h-2 w-2 text-amber-800" /> Sandwich
                        </span>
                      )}
                    </div>

                    {/* Compact Attendance count pill */}
                    {stat && stat.present > 0 && (
                      <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                        ✓ {stat.present}
                      </span>
                    )}
                  </div>

                  {/* Day event tags list */}
                  <div className="space-y-1 mt-1.5 flex-1">
                    {/* Holidays */}
                    {dayHols.map((h) => (
                      <div
                        key={`h-${h.id}`}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-900 border border-purple-200/60 truncate"
                        title={`${h.name} (${h.kind} Holiday)`}
                      >
                        🎉 {h.name}
                      </div>
                    ))}

                    {/* Approved Leaves */}
                    {dayLvs.map((l) => (
                      <div
                        key={`l-${l.id}`}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-900 border border-blue-200/60 truncate"
                        title={`${l.name}: ${l.type} leave`}
                      >
                        🏖️ {l.name}
                      </div>
                    ))}

                    {/* Approved WFH */}
                    {dayWfhs.map((w) => (
                      <div
                        key={`w-${w.id}`}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-teal-50 text-teal-900 border border-teal-200/60 truncate"
                        title={`${w.name}: Work From Home`}
                      >
                        🏠 {w.name}
                      </div>
                    ))}
                  </div>

                  {/* Hint */}
                  <span className="text-[9px] text-mute group-hover:text-pine mt-1 block text-right font-medium">
                    View roster →
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Correct attendance modal with strict validation */}
      <Modal
        open={!!correcting}
        onClose={() => {
          setCorrecting(null);
          setCorrectErrors({});
        }}
        title="Adjust punch record"
        desc={correcting ? `${correcting.name} (${correcting.code}) · ${selectedDate}` : undefined}
        footer={
          <>
            <Btn
              variant="outline"
              onClick={() => {
                setCorrecting(null);
                setCorrectErrors({});
              }}
            >
              Cancel
            </Btn>
            <Btn
              disabled={savingCorrection}
              onClick={handleSaveCorrection}
              icon={savingCorrection ? Loader2 : undefined}
            >
              {savingCorrection ? "Saving..." : "Save adjustment"}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          {Object.keys(correctErrors).length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Please fix the following:</span>
                <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                  {Object.values(correctErrors).map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Check-in time *">
              <input
                type="time"
                required
                className={cn(
                  inputCls,
                  correctErrors.checkIn && "border-red-400 focus:ring-red-400"
                )}
                value={correctForm.checkIn}
                onChange={(e) => {
                  setCorrectForm({ ...correctForm, checkIn: e.target.value });
                  if (correctErrors.checkIn) {
                    setCorrectErrors((prev) => ({ ...prev, checkIn: undefined }));
                  }
                }}
              />
              {correctErrors.checkIn && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {correctErrors.checkIn}
                </p>
              )}
            </Field>

            <Field label="Check-out time *">
              <input
                type="time"
                required
                className={cn(
                  inputCls,
                  correctErrors.checkOut && "border-red-400 focus:ring-red-400"
                )}
                value={correctForm.checkOut}
                onChange={(e) => {
                  setCorrectForm({ ...correctForm, checkOut: e.target.value });
                  if (correctErrors.checkOut) {
                    setCorrectErrors((prev) => ({ ...prev, checkOut: undefined }));
                  }
                }}
              />
              {correctErrors.checkOut && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {correctErrors.checkOut}
                </p>
              )}
            </Field>
          </div>

          <Field
            label="Adjustment Reason *"
            hint="Mandatory. Logged in company audit trail and payroll."
          >
            <input
              required
              className={cn(
                inputCls,
                correctErrors.reason && "border-red-400 focus:ring-red-400"
              )}
              placeholder="e.g. Card scanner glitch, forgot punch out"
              value={correctForm.reason}
              onChange={(e) => {
                setCorrectForm({ ...correctForm, reason: e.target.value });
                if (correctErrors.reason) {
                  setCorrectErrors((prev) => ({ ...prev, reason: undefined }));
                }
              }}
            />
            {correctErrors.reason && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3 shrink-0" /> {correctErrors.reason}
              </p>
            )}
          </Field>
        </div>
      </Modal>
    </>
  );
}
