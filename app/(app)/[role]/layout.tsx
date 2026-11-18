import { notFound } from "next/navigation";
import Shell from "@/components/shell";
import { ROLES, type Role } from "@/lib/roles";

export function generateStaticParams() {
  return ROLES.map((role) => ({ role }));
}

export default async function RoleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!ROLES.includes(role as Role)) notFound();
  return <Shell role={role as Role}>{children}</Shell>;
}
