/**
 * Sandwich Holiday Detection & Policy Engine
 *
 * Rules:
 * 1. Bridge Working Day:
 *    A working day situated between two non-working days (weekend or holiday)
 *    where at least one is a public/company holiday.
 *    Example: Sunday (weekend) + Monday (workday) + Tuesday (Republic Day Holiday).
 *    Monday is a sandwich day!
 *    Example: Thursday (Holiday) + Friday (workday) + Saturday (weekend).
 *    Friday is a sandwich day!
 *
 * 2. Long Weekend Extension:
 *    When a holiday falls adjacent to a weekend (e.g. Friday Christmas + Sat/Sun weekend),
 *    the adjacent working day (Monday Dec 28) and the holiday/weekend span form a
 *    Sandwich Block (Dec 25 - Dec 28). Employees should not take leaves bordering
 *    or extending this block.
 */

export interface HolidayItem {
  id?: number | string;
  name: string;
  date: string; // YYYY-MM-DD
  kind?: string;
}

export interface SandwichDateInfo {
  date: string; // YYYY-MM-DD
  isSandwich: boolean;
  role: "sandwich_workday" | "holiday" | "weekend";
  holidayName: string;
  blockStart: string; // YYYY-MM-DD
  blockEnd: string;   // YYYY-MM-DD
  reason: string;
  warningText: string;
}

export interface SandwichBlock {
  id: string;
  holidayName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  dates: string[];
  sandwichWorkdays: string[];
  description: string;
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, numDays: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + numDays);
  return formatDateStr(date);
}

function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay(); // 0 = Sun, 6 = Sat
}

function isWeekendDay(dateStr: string): boolean {
  const dow = getDayOfWeek(dateStr);
  return dow === 0 || dow === 6; // Sunday or Saturday
}

/**
 * Calculates all sandwich blocks and date-level sandwich metadata for a set of holidays.
 */
export function calculateSandwichBlocks(
  holidays: HolidayItem[],
  targetYear?: number
): {
  blocks: SandwichBlock[];
  dateMap: Map<string, SandwichDateInfo>;
} {
  const holidayDateMap = new Map<string, HolidayItem>();
  for (const h of holidays) {
    if (h.date) {
      holidayDateMap.set(h.date, h);
    }
  }

  const isHoliday = (d: string) => holidayDateMap.has(d);
  const isOff = (d: string) => isWeekendDay(d) || isHoliday(d);

  const blocks: SandwichBlock[] = [];
  const dateMap = new Map<string, SandwichDateInfo>();

  // Process each holiday to find associated sandwich blocks
  for (const holiday of holidays) {
    const hDate = holiday.date;
    if (targetYear && !hDate.startsWith(String(targetYear))) {
      // If targetYear specified, skip holidays outside that year range (allow Dec/Jan boundaries)
      const holYear = parseInt(hDate.split("-")[0], 10);
      if (Math.abs(holYear - targetYear) > 1) continue;
    }

    const dow = getDayOfWeek(hDate); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat

    // CASE 1: Holiday is on Friday (e.g. Christmas Dec 25)
    // Friday (Holiday) + Sat (Weekend) + Sun (Weekend) + Monday (Workday sandwich)
    // Entire block: Dec 25 to Dec 28
    if (dow === 5) {
      const sat = addDays(hDate, 1);
      const sun = addDays(hDate, 2);
      const mon = addDays(hDate, 3); // Sandwich workday
      const thu = addDays(hDate, -1); // Pre-holiday workday

      const blockDates = [hDate, sat, sun, mon];
      const blockId = `sandwich-${hDate}-${mon}`;

      blocks.push({
        id: blockId,
        holidayName: holiday.name,
        startDate: hDate,
        endDate: mon,
        dates: blockDates,
        sandwichWorkdays: [mon],
        description: `${holiday.name} Sandwich Block (${hDate} to ${mon}): Friday holiday combined with weekend and Monday. Do not approve leave on Monday (${mon}).`,
      });

      // Map dates
      dateMap.set(hDate, {
        date: hDate,
        isSandwich: true,
        role: "holiday",
        holidayName: holiday.name,
        blockStart: hDate,
        blockEnd: mon,
        reason: `${holiday.name} (Public Holiday) · Starts 4-day sandwich period (${hDate} to ${mon})`,
        warningText: `Holiday part of sandwich period (${hDate} - ${mon}).`,
      });

      dateMap.set(sat, {
        date: sat,
        isSandwich: true,
        role: "weekend",
        holidayName: holiday.name,
        blockStart: hDate,
        blockEnd: mon,
        reason: `Saturday Weekend · Connected to ${holiday.name} sandwich (${hDate} - ${mon})`,
        warningText: `Weekend in sandwich block.`,
      });

      dateMap.set(sun, {
        date: sun,
        isSandwich: true,
        role: "weekend",
        holidayName: holiday.name,
        blockStart: hDate,
        blockEnd: mon,
        reason: `Sunday Weekend · Connected to ${holiday.name} sandwich (${hDate} - ${mon})`,
        warningText: `Weekend in sandwich block.`,
      });

      dateMap.set(mon, {
        date: mon,
        isSandwich: true,
        role: "sandwich_workday",
        holidayName: holiday.name,
        blockStart: hDate,
        blockEnd: mon,
        reason: `⚠️ Sandwich Day: Monday bordering ${holiday.name} weekend (${hDate} - ${mon}). Policy: Do not approve leave.`,
        warningText: `Leave on this day clubs with ${holiday.name} and weekend (${hDate} - ${mon}). Strictly avoid approving.`,
      });
    }

    // CASE 2: Holiday is on Monday
    // Friday (Workday) + Sat (Weekend) + Sun (Weekend) + Mon (Holiday) + Tue (Workday)
    // Friday and Tuesday are sandwich boundary days
    else if (dow === 1) {
      const fri = addDays(hDate, -3); // Sandwich workday
      const sat = addDays(hDate, -2);
      const sun = addDays(hDate, -1);
      const tue = addDays(hDate, 1);  // Sandwich workday

      const blockDates = [fri, sat, sun, hDate, tue];
      const blockId = `sandwich-${fri}-${tue}`;

      blocks.push({
        id: blockId,
        holidayName: holiday.name,
        startDate: fri,
        endDate: tue,
        dates: blockDates,
        sandwichWorkdays: [fri, tue],
        description: `${holiday.name} Sandwich Block (${fri} to ${tue}): Monday holiday adjacent to weekend. Friday (${fri}) and Tuesday (${tue}) are sandwich days.`,
      });

      dateMap.set(fri, {
        date: fri,
        isSandwich: true,
        role: "sandwich_workday",
        holidayName: holiday.name,
        blockStart: fri,
        blockEnd: tue,
        reason: `⚠️ Sandwich Day: Friday before ${holiday.name} weekend (${fri} - ${hDate}). Policy: Do not approve leave.`,
        warningText: `Taking Friday off clubs with weekend and ${holiday.name}.`,
      });

      dateMap.set(sat, {
        date: sat,
        isSandwich: true,
        role: "weekend",
        holidayName: holiday.name,
        blockStart: fri,
        blockEnd: tue,
        reason: `Saturday Weekend · Part of ${holiday.name} sandwich period`,
        warningText: `Weekend in sandwich block.`,
      });

      dateMap.set(sun, {
        date: sun,
        isSandwich: true,
        role: "weekend",
        holidayName: holiday.name,
        blockStart: fri,
        blockEnd: tue,
        reason: `Sunday Weekend · Part of ${holiday.name} sandwich period`,
        warningText: `Weekend in sandwich block.`,
      });

      dateMap.set(hDate, {
        date: hDate,
        isSandwich: true,
        role: "holiday",
        holidayName: holiday.name,
        blockStart: fri,
        blockEnd: tue,
        reason: `${holiday.name} (Public Holiday) · Part of sandwich period (${fri} - ${tue})`,
        warningText: `Holiday part of sandwich period.`,
      });

      dateMap.set(tue, {
        date: tue,
        isSandwich: true,
        role: "sandwich_workday",
        holidayName: holiday.name,
        blockStart: fri,
        blockEnd: tue,
        reason: `⚠️ Sandwich Day: Tuesday after ${holiday.name} (${hDate}). Policy: Do not approve leave.`,
        warningText: `Taking Tuesday off clubs with ${holiday.name} and weekend.`,
      });
    }

    // CASE 3: Holiday is on Tuesday (e.g. Republic Day Jan 26)
    // Sunday (Weekend) + Monday (Workday Sandwich!) + Tuesday (Holiday)
    else if (dow === 2) {
      const sun = addDays(hDate, -2);
      const mon = addDays(hDate, -1); // Sandwich workday
      const wed = addDays(hDate, 1);

      const blockDates = [sun, mon, hDate];
      const blockId = `sandwich-${sun}-${hDate}`;

      blocks.push({
        id: blockId,
        holidayName: holiday.name,
        startDate: sun,
        endDate: hDate,
        dates: blockDates,
        sandwichWorkdays: [mon],
        description: `${holiday.name} Sandwich Block (${sun} to ${hDate}): Monday (${mon}) is sandwiched between Sunday weekend and Tuesday holiday. Do not approve leave on Monday.`,
      });

      dateMap.set(sun, {
        date: sun,
        isSandwich: true,
        role: "weekend",
        holidayName: holiday.name,
        blockStart: sun,
        blockEnd: hDate,
        reason: `Sunday Weekend · Sandwiches Monday with ${holiday.name}`,
        warningText: `Weekend in sandwich block.`,
      });

      dateMap.set(mon, {
        date: mon,
        isSandwich: true,
        role: "sandwich_workday",
        holidayName: holiday.name,
        blockStart: sun,
        blockEnd: hDate,
        reason: `⚠️ Sandwich Day: Monday between Sunday and ${holiday.name} (${hDate}). Policy: Do not approve leave.`,
        warningText: `Monday (${mon}) is sandwiched between Sunday weekend and ${holiday.name} (${hDate}). Avoid approving leave.`,
      });

      dateMap.set(hDate, {
        date: hDate,
        isSandwich: true,
        role: "holiday",
        holidayName: holiday.name,
        blockStart: sun,
        blockEnd: hDate,
        reason: `${holiday.name} (Public Holiday) · Part of sandwich period (${sun} - ${hDate})`,
        warningText: `Holiday part of sandwich period.`,
      });
    }

    // CASE 4: Holiday is on Thursday
    // Thursday (Holiday) + Friday (Workday Sandwich!) + Saturday (Weekend) + Sunday (Weekend)
    else if (dow === 4) {
      const fri = addDays(hDate, 1); // Sandwich workday
      const sat = addDays(hDate, 2);
      const sun = addDays(hDate, 3);

      const blockDates = [hDate, fri, sat, sun];
      const blockId = `sandwich-${hDate}-${sun}`;

      blocks.push({
        id: blockId,
        holidayName: holiday.name,
        startDate: hDate,
        endDate: sun,
        dates: blockDates,
        sandwichWorkdays: [fri],
        description: `${holiday.name} Sandwich Block (${hDate} to ${sun}): Friday (${fri}) is sandwiched between Thursday holiday and weekend. Do not approve leave on Friday.`,
      });

      dateMap.set(hDate, {
        date: hDate,
        isSandwich: true,
        role: "holiday",
        holidayName: holiday.name,
        blockStart: hDate,
        blockEnd: sun,
        reason: `${holiday.name} (Public Holiday) · Sandwiches Friday with weekend`,
        warningText: `Holiday part of sandwich period.`,
      });

      dateMap.set(fri, {
        date: fri,
        isSandwich: true,
        role: "sandwich_workday",
        holidayName: holiday.name,
        blockStart: hDate,
        blockEnd: sun,
        reason: `⚠️ Sandwich Day: Friday between ${holiday.name} (${hDate}) and weekend. Policy: Do not approve leave.`,
        warningText: `Friday (${fri}) is sandwiched between ${holiday.name} and weekend. Avoid approving leave.`,
      });

      dateMap.set(sat, {
        date: sat,
        isSandwich: true,
        role: "weekend",
        holidayName: holiday.name,
        blockStart: hDate,
        blockEnd: sun,
        reason: `Saturday Weekend · Connected to ${holiday.name} sandwich`,
        warningText: `Weekend in sandwich block.`,
      });

      dateMap.set(sun, {
        date: sun,
        isSandwich: true,
        role: "weekend",
        holidayName: holiday.name,
        blockStart: hDate,
        blockEnd: sun,
        reason: `Sunday Weekend · Connected to ${holiday.name} sandwich`,
        warningText: `Weekend in sandwich block.`,
      });
    }

    // CASE 5: Holiday is on Wednesday
    // Tuesday (Workday) + Wed (Holiday) + Thursday (Workday)
    // If adjacent days are also holidays or leaves
    else if (dow === 3) {
      // Mark Wed as holiday
      if (!dateMap.has(hDate)) {
        dateMap.set(hDate, {
          date: hDate,
          isSandwich: false,
          role: "holiday",
          holidayName: holiday.name,
          blockStart: hDate,
          blockEnd: hDate,
          reason: `${holiday.name} (Mid-week Public Holiday)`,
          warningText: `Mid-week holiday.`,
        });
      }
    }
  }

  return { blocks, dateMap };
}

/**
 * Checks if a leave request from startDate to endDate overlaps with any sandwich workday.
 */
export function checkLeaveSandwichConflict(
  startDate: string,
  endDate: string,
  sandwichMap: Map<string, SandwichDateInfo>
): {
  hasConflict: boolean;
  conflictingDates: string[];
  holidayName?: string;
  blockRange?: string;
  warningMessage?: string;
} {
  const conflictingDates: string[] = [];
  let matchedInfo: SandwichDateInfo | undefined;

  let curr = startDate;
  while (curr <= endDate) {
    const info = sandwichMap.get(curr);
    if (info && info.isSandwich && info.role === "sandwich_workday") {
      conflictingDates.push(curr);
      if (!matchedInfo) matchedInfo = info;
    }
    curr = addDays(curr, 1);
  }

  if (conflictingDates.length > 0 && matchedInfo) {
    return {
      hasConflict: true,
      conflictingDates,
      holidayName: matchedInfo.holidayName,
      blockRange: `${matchedInfo.blockStart} to ${matchedInfo.blockEnd}`,
      warningMessage: `⚠️ Sandwich Leave Conflict: Dates ${conflictingDates.join(", ")} club with ${matchedInfo.holidayName} (${matchedInfo.blockStart} to ${matchedInfo.blockEnd}). HR policy advises not approving.`,
    };
  }

  return {
    hasConflict: false,
    conflictingDates: [],
  };
}
