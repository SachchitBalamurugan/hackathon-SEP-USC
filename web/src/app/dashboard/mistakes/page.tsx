import { requireUser } from "@/lib/session";
import { db } from "@/lib/supabase";
import { TopBar } from "@/components/shell/TopBar";
import { MistakesList, type MistakeRow } from "./MistakesList";

export const metadata = { title: "Mistakes" };

export default async function MistakesPage() {
  const user = await requireUser();
  const { data } = await db()
    .from("mistakes")
    .select("id, skill_label, note, misconception, subject, page_host, resolved_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);
  return (
    <>
      <TopBar title="Mistakes" description="Every mistake StudyLens found in your work, and the thinking that probably caused it." demo="check" />
      <MistakesList initial={(data ?? []) as MistakeRow[]} />
    </>
  );
}
