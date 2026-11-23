// Utility for calculating worked hours: Today, This Week, This Month

export interface DurationResult {
  hours: number; // decimal e.g. 8.75
  formatted: string; // e.g. "8h 45m"
  isActive?: boolean;
}

export interface AttendanceHoursSummary {
  todayHours: number;
  todayFormatted: string;
  todayStatus: "checked_out" | "checked_in" | "not_checked_in";
  weekHours: number;
  weekFormatted: string;
  monthHours: number;
  monthFormatted: string;
  avgDailyHours: number;
  avgDailyFormatted: string;
}

// Convert "HH:mm:ss" or "HH:mm" to minutes since midnight
export function timeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr || timeStr === "—" || timeStr === "-") return null;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// Format minutes into e.g. "8h 30m"
export function formatMinutesToHours(minutes: number): string {
  if (minutes <= 0) return "0h 00m";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

// Calculate hours for a single attendance record
export function calculateRecordHours(
  checkIn?: string | null,
  checkOut?: string | null,
  dateStr?: string | null,
  todayStr?: string
): DurationResult {
  const inMin = timeToMinutes(checkIn);
  if (inMin === null) {
    return { hours: 0, formatted: "—" };
  }

  const outMin = timeToMinutes(checkOut);

  // If checked out, calculate exact interval
  if (outMin !== null && outMin >= inMin) {
    const diff = outMin - inMin;
    return {
      hours: Math.round((diff / 60) * 100) / 100,
      formatted: formatMinutesToHours(diff),
    };
  }

  // If not checked out yet and it is today
  const isToday = Boolean(todayStr && dateStr && (dateStr === todayStr || dateStr.startsWith(todayStr)));
  if (isToday) {
    const now = new Date();
    // Get current minutes in IST (Asia/Kolkata)
    const istTimeStr = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);
    const nowMin = timeToMinutes(istTimeStr) || (now.getHours() * 60 + now.getMinutes());

    const diff = Math.max(0, nowMin - inMin);
    return {
      hours: Math.round((diff / 60) * 100) / 100,
      formatted: `${formatMinutesToHours(diff)} (in progress)`,
      isActive: true,
    };
  }

  // Past day where employee forgot to check out (assume standard 8.5h shift or 0)
  return {
    hours: 8.5,
    formatted: "8h 30m",
  };
}

// Get Monday of the current week (ISO week)
export function getMondayOfCurrentWeek(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(date.setDate(diff));
  return monday.toISOString().split("T")[0];
}

// Calculate Today, Week, and Month hours from a set of records
export function calculateAttendanceHoursSummary(
  records: Array<{
    date: string;
    checkIn?: string | null;
    checkOut?: string | null;
    status?: string;
  }>,
  todayStr?: string
): AttendanceHoursSummary {
  const today = todayStr || new Date().toISOString().split("T")[0];
  const monday = getMondayOfCurrentWeek(new Date(today));

  let todayMin = 0;
  let todayStatus: "checked_out" | "checked_in" | "not_checked_in" = "not_checked_in";
  let weekMin = 0;
  let monthMin = 0;
  let presentDays = 0;

  for (const r of records) {
    const dateOnly = r.date.split("T")[0];
    const inMin = timeToMinutes(r.checkIn);
    const outMin = timeToMinutes(r.checkOut);

    if (inMin !== null) {
      let dur = 0;
      if (outMin !== null && outMin >= inMin) {
        dur = outMin - inMin;
      } else if (dateOnly === today) {
        const now = new Date();
        const istTimeStr = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(now);
        const nowMin = timeToMinutes(istTimeStr) || (now.getHours() * 60 + now.getMinutes());
        dur = Math.max(0, nowMin - inMin);
      } else {
        dur = 8.5 * 60;
      }

      // Check if Today
      if (dateOnly === today) {
        todayMin = dur;
        todayStatus = outMin !== null ? "checked_out" : "checked_in";
      }

      // Check if within current week (Monday to Sunday)
      if (dateOnly >= monday) {
        weekMin += dur;
      }

      // Check if in current month
      const currentMonthPrefix = today.slice(0, 7); // "YYYY-MM"
      if (dateOnly.startsWith(currentMonthPrefix)) {
        monthMin += dur;
        presentDays++;
      }
    }
  }

  const avgMin = presentDays > 0 ? Math.round(monthMin / presentDays) : 0;

  return {
    todayHours: Math.round((todayMin / 60) * 100) / 100,
    todayFormatted: formatMinutesToHours(todayMin),
    todayStatus,
    weekHours: Math.round((weekMin / 60) * 100) / 100,
    weekFormatted: formatMinutesToHours(weekMin),
    monthHours: Math.round((monthMin / 60) * 100) / 100,
    monthFormatted: formatMinutesToHours(monthMin),
    avgDailyHours: Math.round((avgMin / 60) * 10) / 10,
    avgDailyFormatted: formatMinutesToHours(avgMin),
  };
}
