"use client";

import { useRole } from "@/lib/role";
import CalendarApprovalsPage from "@/app/hr/calendar/page";
import EmployeeCalendarPage from "@/app/employee/calendar/page";

export default function CalendarPage() {
  const role = useRole();
  if (role === "employee") {
    return <EmployeeCalendarPage />;
  }
  return <CalendarApprovalsPage />;
}
