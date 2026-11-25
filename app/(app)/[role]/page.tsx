import { redirect } from "next/navigation";

export const instant = false;
export const dynamic = "force-dynamic";

export default async function RoleIndex({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  redirect(`/${role}/dashboard`);
}
