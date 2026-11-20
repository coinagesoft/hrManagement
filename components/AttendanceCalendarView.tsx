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
  Wifi,
} from "lucide-react";
import { Avatar, Badge, Btn, Card, Empty, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui";
import { Field, Modal, inputCls, useToast } from "@/components/interactive";
import { DAYS_SHORT, MONTHS, pad } from "@/lib/dates";
import { cn } from "@/lib/cn";

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
  ip: string;
  leaveReason?: string | null;
  leaveType?: string | null;
}

function formatSelectedDay(s: string) {
  if (!s) return "";
  const [y, m, d] = s.split("-").map(Number);
  const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(y, m - 1, d).getDay()];
  const monthName = MONTHS[m - 1] || "";
  return `${dayName}, ${d} ${monthName} ${y}`;
}

export default function AttendanceCalendarView() {
  const toast = useToast();

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
  const [monthLeaves, setMonthLeaves] = useState<LeaveMarker[]>([]);
  const [monthWfhs, setMonthWfhs] = useState<WfhMarker[]>([]);
  const [monthStats, setMonthStats] = useState<AttendanceStat[]>([]);
  const [roster, setRoster] = useState<TeamRow[]>([]);

  // Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Correction Modal
  const [correcting, setCorrecting] = useState<TeamRow | null>(null);
  const [correctForm, setCorrectForm] = useState({ checkIn: "09:30", checkOut: "18:30", reason: "" });
  const [savingCorrection, setSavingCorrection] = useState(false);

  // Initialize today's date safely in useEffect (avoids Next.js prerender date warnings)
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
    const [y, m] = today.split("-").map(Number);
    setYm({ y, m: m - 1 });
  }, []);

  // Fetch month calendar events (holidays, leaves, wfh, attendance stats)
  const fetchMonthEvents = async (year: number, monthIndex: number) => {
    setLoadingCalendar(true);
    try {
      const res = await fetch(`/api/hr/calendar?year=${year}&month=${monthIndex + 1}`);
      const json = await res.json();
      if (json?.success) {
        setHolidays(json.holidays || []);
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
      const res = await fetch(`/api/admin/attendance?date=${dateStr}`);
      const data = await res.json();
      if (data?.success && data?.roster) {
        setRoster(data.roster);
      }
    } catch (err) {
      console.error("Failed to load attendance roster:", err);
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

  // Calendar math
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

  // Export full month attendance to Excel (CSV with UTF-8 BOM)
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/admin/attendance?export=true&year=${ym.y}&monthNum=${ym.m + 1}`);
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
    return {
      dateStr,
      hasHoliday: dayHolidays.length > 0,
      holidays: dayHolidays,
      hasLeave: dayLeaves.length > 0,
      leaves: dayLeaves,
      hasWfh: dayWfhs.length > 0,
      wfhs: dayWfhs,
      stat: dayStat,
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

  const handleSaveCorrection = async () => {
    if (!correcting) return;
    setSavingCorrection(true);
    try {
      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: correcting.userId,
          date: selectedDate,
          checkIn: correctForm.checkIn,
          checkOut: correctForm.checkOut,
          notes: correctForm.reason,
          status: "Present",
          mode: correcting.mode === "-" ? "Office" : correcting.mode,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Failed to update attendance");

      toast("Punch time corrected and logged in audit trail");
      setCorrecting(null);
      await fetchDateRoster(selectedDate);
    } catch (err: any) {
      toast(err.message || "Failed to save correction");
    } finally {
      setSavingCorrection(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Attendance & Calendar"
        desc="Interactive company calendar, daily employee presenty roster, and monthly attendance exports."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer",
                  viewMode === "split" ? "bg-pine text-white" : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Columns className="h-3.5 w-3.5" />
                <span>Roster & Mini</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("full")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer",
                  viewMode === "full" ? "bg-pine text-white" : "text-slate-600 hover:text-slate-900"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Full Calendar</span>
              </button>
            </div>

            {/* Export to Excel */}
            <Btn
              variant="outline"
              icon={exporting ? Loader2 : Download}
              onClick={handleExportExcel}
              disabled={exporting}
            >
              {exporting ? "Preparing Excel..." : `Export ${MONTHS[ym.m]} to Excel`}
            </Btn>
          </div>
        }
      />

      {/* VIEW MODE 1: Split View (Interactive Mini Calendar + Daily Roster) */}
      {viewMode === "split" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Interactive Mini Calendar & Holidays */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-4 sm:p-5">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-slate-900 text-sm">
                  {MONTHS[ym.m]} {ym.y}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                    title="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleJumpToday}
                    className="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                    title="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Days of Week Header */}
              <div className="grid grid-cols-7 text-center mb-1">
                {DAYS_SHORT.map((d) => (
                  <span key={d} className="text-[11px] font-semibold text-slate-400 uppercase py-1">
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
                  const { dateStr, hasHoliday, hasLeave } = getDayMeta(dayNum);
                  const isSelected = selectedDate === dateStr;

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setSelectedDate(dateStr)}
                      className={cn(
                        "h-9 w-full rounded-lg text-xs font-medium relative flex flex-col items-center justify-center transition cursor-pointer",
                        isSelected
                          ? "bg-pine text-white font-bold shadow-xs"
                          : "text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <span>{dayNum}</span>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {hasHoliday && (
                          <span
                            className={cn(
                              "h-1 w-1 rounded-full",
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

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-pine" /> Selected
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-600" /> Holiday
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" /> Approved Leave
                </span>
              </div>
            </Card>

            {/* Month Holidays Card */}
            <Card className="p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Holidays in {MONTHS[ym.m]}
              </span>
              {holidays.length === 0 ? (
                <p className="text-xs text-mute py-1">No company holidays scheduled this month.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {holidays.map((h) => (
                    <li key={h.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <b className="font-semibold text-slate-800">{h.name}</b>
                        <span className="block text-[11px] text-mute">{h.kind} Holiday</span>
                      </div>
                      <Badge tone="indigo">{h.date}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Right Column: Attendance Roster for Selected Day */}
          <div className="lg:col-span-7">
            <Card>
              {/* Header with Date & Filter Strip */}
              <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">
                      {formatSelectedDay(selectedDate)}
                    </h3>
                    <span className="text-xs text-mute">Daily attendance presenty</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative w-44 sm:w-56">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        className={`${inputCls} !py-1 !pl-8 text-xs`}
                        placeholder="Search employee..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <select
                      className={`${inputCls} !w-auto !py-1 text-xs cursor-pointer`}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="All">All statuses</option>
                      <option value="Present">Present</option>
                      <option value="Late">Late</option>
                      <option value="On leave">On leave</option>
                      <option value="WFH">WFH</option>
                      <option value="Absent">Absent</option>
                    </select>
                  </div>
                </div>

                {/* Status Badge Counters */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge tone="green" dot>
                    Present {countBy("Present")}
                  </Badge>
                  <Badge tone="amber" dot>
                    Late {countBy("Late")}
                  </Badge>
                  <Badge tone="indigo" dot>
                    On leave {countBy("On leave")}
                  </Badge>
                  <Badge tone="teal" dot>
                    WFH {wfhCount}
                  </Badge>
                  <Badge tone="slate" dot>
                    Absent {countBy("Absent")}
                  </Badge>
                </div>
              </div>

              {/* Attendance Table */}
              {loadingRoster ? (
                <div className="flex items-center justify-center p-16 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading attendance...
                </div>
              ) : filteredRoster.length === 0 ? (
                <Empty
                  icon={Clock}
                  title="No attendance records"
                  desc={`No records found for ${selectedDate} matching your filters.`}
                />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Employee</Th>
                      <Th>In</Th>
                      <Th>Out</Th>
                      <Th>Mode</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Action</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoster.map((r) => (
                      <tr key={r.userId}>
                        <Td>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={r.name} />
                            <div>
                              <p className="font-medium text-slate-900 text-xs">{r.name}</p>
                              <p className="text-[11px] text-slate-500">
                                {r.code} · {r.dept}
                              </p>
                            </div>
                          </div>
                        </Td>
                        <Td className="font-mono text-xs">{r.in}</Td>
                        <Td className="font-mono text-xs">{r.out}</Td>
                        <Td>
                          {r.mode === "-" ? (
                            <span className="text-slate-400 text-xs">—</span>
                          ) : (
                            <Badge tone={r.mode === "WFH" ? "teal" : "blue"}>{r.mode}</Badge>
                          )}
                        </Td>
                        <Td>
                          <div className="flex flex-col gap-0.5">
                            <StatusBadge s={r.status} />
                            {r.status === "On leave" && r.leaveReason && (
                              <span className="text-[10px] text-slate-500 truncate max-w-[120px]" title={r.leaveReason}>
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
                              setCorrectForm({
                                checkIn: r.in === "-" ? "09:30" : r.in,
                                checkOut: r.out === "-" ? "18:30" : r.out,
                                reason: "",
                              });
                            }}
                          >
                            Correct
                          </Btn>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: Full Month Calendar Grid (All Data Visible in Full Width) */}
      {viewMode === "full" && (
        <Card className="p-4 sm:p-6 space-y-4">
          {/* Calendar Month Header & Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {MONTHS[ym.m]} {ym.y}
              </h2>
              <p className="text-xs text-mute">
                Overview of company holidays, employee leaves, approved WFH, and attendance statistics. Click any day to inspect its daily roster.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                title="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleJumpToday}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                title="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Full Grid Day Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 text-center font-semibold text-xs text-slate-500 py-2">
            {DAYS_SHORT.map((d) => (
              <span key={d} className="uppercase tracking-wider">
                {d}
              </span>
            ))}
          </div>

          {/* Full Month Grid Cells */}
          <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
            {/* Empty leading cells */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`full-empty-${i}`} className="min-h-28 bg-slate-50/60 p-2" />
            ))}

            {/* Days of the month */}
            {Array.from({ length: totalDaysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const { dateStr, holidays: dayHols, leaves: dayLvs, wfhs: dayWfhs, stat } = getDayMeta(dayNum);
              const isSelected = selectedDate === dateStr;

              return (
                <div
                  key={`full-${dateStr}`}
                  onClick={() => {
                    setSelectedDate(dateStr);
                    setViewMode("split");
                  }}
                  className={cn(
                    "min-h-28 p-2 flex flex-col justify-between transition cursor-pointer group bg-white",
                    isSelected ? "ring-2 ring-inset ring-pine bg-pine-soft/20" : "hover:bg-slate-50"
                  )}
                >
                  {/* Day number header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold",
                        isSelected ? "bg-pine text-white" : "text-slate-800 group-hover:bg-slate-200"
                      )}
                    >
                      {dayNum}
                    </span>

                    {/* Compact Attendance count pill */}
                    {stat && stat.present > 0 && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        ✓ {stat.present} present
                      </span>
                    )}
                  </div>

                  {/* Day event tags list */}
                  <div className="space-y-1 mt-1.5 flex-1">
                    {/* Holidays */}
                    {dayHols.map((h) => (
                      <div
                        key={`h-${h.id}`}
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-900 truncate"
                        title={`${h.name} (${h.kind} Holiday)`}
                      >
                        🎉 {h.name}
                      </div>
                    ))}

                    {/* Approved Leaves */}
                    {dayLvs.map((l) => (
                      <div
                        key={`l-${l.id}`}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-900 truncate"
                        title={`${l.name}: ${l.type} leave`}
                      >
                        🏖️ {l.name} ({l.type})
                      </div>
                    ))}

                    {/* Approved WFH */}
                    {dayWfhs.map((w) => (
                      <div
                        key={`w-${w.id}`}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-teal-100 text-teal-900 truncate"
                        title={`${w.name}: Work From Home`}
                      >
                        🏠 {w.name} (WFH)
                      </div>
                    ))}
                  </div>

                  {/* Hint */}
                  <span className="text-[9px] text-slate-400 group-hover:text-pine mt-1 block text-right">
                    Click to view roster →
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Correct attendance modal */}
      <Modal
        open={!!correcting}
        onClose={() => setCorrecting(null)}
        title="Correct attendance timestamp"
        desc={correcting ? `${correcting.name} · ${selectedDate}` : undefined}
        footer={
          <>
            <Btn variant="outline" onClick={() => setCorrecting(null)}>
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Check-in time">
              <input
                type="time"
                className={inputCls}
                value={correctForm.checkIn}
                onChange={(e) => setCorrectForm({ ...correctForm, checkIn: e.target.value })}
              />
            </Field>
            <Field label="Check-out time">
              <input
                type="time"
                className={inputCls}
                value={correctForm.checkOut}
                onChange={(e) => setCorrectForm({ ...correctForm, checkOut: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Reason" hint="Logged in the company audit trail.">
            <input
              className={inputCls}
              placeholder="e.g. Card scanner glitch, forgot to punch out"
              value={correctForm.reason}
              onChange={(e) => setCorrectForm({ ...correctForm, reason: e.target.value })}
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
