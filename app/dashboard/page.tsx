import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserSanctuary } from "@/lib/room/actions";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const hasSupabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

  if (hasSupabase) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }
  }

  const sanctuary = await getUserSanctuary();

  return <DashboardClient initialSanctuary={sanctuary} />;
}
