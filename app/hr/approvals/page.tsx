import { redirect } from "next/navigation";

export const instant = false;
export const dynamic = "force-dynamic";

// Approvals now live on the Calendar page.
export default function Page() { redirect("/hr/calendar"); }
