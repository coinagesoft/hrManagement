import { redirect } from "next/navigation";

export const instant = false;
export const dynamic = "force-dynamic";

export default function Home() {
  redirect("/login");
}
