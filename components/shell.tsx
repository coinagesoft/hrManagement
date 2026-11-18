"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = {
  super: [["Dashboard", "/super"], ["Companies", "/super/companies"]],
  admin: [["Dashboard", "/admin"], ["Employees", "/admin/employees"], ["Calendar", "/admin/calendar"], ["Documents", "/admin/documents"], ["Messages", "/admin/messages"], ["Settings", "/admin/settings"]],
  hr: [["Dashboard", "/hr"], ["Employees", "/hr/employees"], ["Calendar & approvals", "/hr/calendar"], ["Documents", "/hr/documents"], ["Payroll", "/hr/payroll"], ["Messages", "/hr/messages"]],
  employee: [["Home", "/employee"], ["Attendance", "/employee/attendance"], ["Leave", "/employee/leave"], ["Calendar", "/employee/calendar"], ["Documents", "/employee/documents"], ["Messages", "/employee/messages"]],
} as const;

export type Role = keyof typeof NAV;

const WHO: Record<Role, { name: string; sub: string }> = {
  super: { name: "Platform owner", sub: "Super Admin" },
  admin: { name: "Meera Joshi", sub: "Admin · Sahyadri Logistics" },
  hr: { name: "Rohan Desai", sub: "HR · Sahyadri Logistics" },
  employee: { name: "Ananya Kulkarni", sub: "Employee · Sahyadri Logistics" },
};

export function Shell({ role, children }: { role: Role; children: React.ReactNode }) {
  const path = usePathname();
  const who = WHO[role];
  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_1fr]">
      <aside className="flex flex-col border-b border-line bg-white md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-pine text-sm font-bold text-white">H</span>
          <span className="font-semibold">HR Platform</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {NAV[role].map(([label, href]) => {
            const on = path === href || (href.split("/").length > 2 && path.startsWith(href));
            return (
              <Link key={href} href={href} aria-current={on ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${on ? "bg-pine-soft text-pine" : "text-mute hover:bg-canvas hover:text-ink"}`}>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto hidden border-t border-line p-4 text-xs text-mute md:block">
          <p className="mb-2 font-medium text-ink">Preview as</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {(["super", "admin", "hr", "employee"] as Role[]).map((r) => (
              <Link key={r} href={NAV[r][0][1]} className={r === role ? "font-medium text-pine" : "hover:text-ink"}>{r === "super" ? "Super Admin" : r === "hr" ? "HR" : r[0].toUpperCase() + r.slice(1)}</Link>
            ))}
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between border-b border-line bg-white px-6 py-3">
          <p className="text-sm text-mute">Tue 17 Nov 2026</p>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight">{who.name}</p>
              <p className="text-xs text-mute">{who.sub}</p>
            </div>
            <Link href="/login" className="btn-ghost btn-sm">Sign out</Link>
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-6">{children}</main>
      </div>
    </div>
  );
}
