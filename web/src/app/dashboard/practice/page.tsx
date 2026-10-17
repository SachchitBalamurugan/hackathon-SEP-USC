import { requireUser } from "@/lib/session";
import { getOpenMistakes } from "@/lib/learner";
import { PracticeSession } from "@/components/PracticeSession";

export default async function PracticePage() {
  const user = await requireUser();
  const mistakes = await getOpenMistakes(user.id, 10);
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold">Practice</h1>
      <p className="mt-1 text-sm text-muted">Problems written for the misconception behind your recent mistakes, scheduled so you see them again right before you&apos;d forget.</p>
      <PracticeSession mistakes={mistakes.map((m) => ({ id: m.id, skill: m.skill_label, note: m.note }))} />
    </div>
  );
}
