import { requireUser } from "@/lib/session";
import { getMastery, getOpenMistakes } from "@/lib/learner";
import { TopBar } from "@/components/shell/TopBar";
import { PracticeSession } from "@/components/PracticeSession";

export const metadata = { title: "Practice" };

export default async function PracticePage({ searchParams }: PageProps<"/dashboard/practice">) {
  const user = await requireUser();
  const sp = (await searchParams) as { mistake?: string; skill?: string };
  const [mistakes, mastery] = await Promise.all([getOpenMistakes(user.id, 8), getMastery(user.id)]);
  const weak = mastery.filter((m) => m.status === "shaky" || m.level < 0.6).slice(0, 6);
  return (
    <>
      <TopBar title="Practice" description="Problems written for what you got wrong, scheduled to come back right before you'd forget." demo="practice" />
      <PracticeSession
        mistakes={mistakes.map((m) => ({ id: m.id, skill: m.skill_label, note: m.note }))}
        weakSkills={weak.map((m) => m.label)}
        initialMistake={sp.mistake}
        initialSkill={sp.skill}
      />
    </>
  );
}
