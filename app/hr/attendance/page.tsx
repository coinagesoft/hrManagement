"use client";

import AttendanceCalendarView from "@/components/AttendanceCalendarView";
import { RoleProvider } from "@/lib/role";

export default function Page() {
  return (
    <RoleProvider value="hr">
      <AttendanceCalendarView />
    </RoleProvider>
  );
}
