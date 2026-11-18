// Plain module (no "use client") so server components can import it.
export type Role = "super" | "admin" | "hr" | "employee";
export const ROLES: Role[] = ["super", "admin", "hr", "employee"];
export const ROLE_LABEL: Record<Role, string> = {
  super: "Super Admin",
  admin: "Admin (Owner)",
  hr: "HR",
  employee: "Employee",
};
export const isManager = (r: Role) => r === "admin" || r === "hr";
