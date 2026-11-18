"use client";
import { useRole } from "@/lib/role";
import SuperDashboard from "@/components/dashboards/SuperDashboard";
import ManagerDashboard from "@/components/dashboards/ManagerDashboard";
import EmployeeDashboard from "@/components/dashboards/EmployeeDashboard";

export default function DashboardPage() {
  const role = useRole();
  if (role === "super") return <SuperDashboard />;
  if (role === "employee") return <EmployeeDashboard />;
  return <ManagerDashboard />;
}
