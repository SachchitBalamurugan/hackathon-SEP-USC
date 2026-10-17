import { requireUser } from "@/lib/session";
import { getSkillGraph } from "@/lib/overview";
import { TopBar } from "@/components/shell/TopBar";
import { Empty, Sheet } from "@/components/ui";
import { SkillsView } from "./SkillsView";

export const metadata = { title: "Skills" };

export default async function SkillsPage() {
  const user = await requireUser();
  const graph = await getSkillGraph(user.id);
  return (
    <>
      <TopBar title="Skills" description="Everything StudyLens has seen you do, weighted toward what you did recently." demo="skills" />
      {graph.nodes.length ? (
        <SkillsView graph={graph} />
      ) : (
        <Sheet>
          <Empty title="Your map is empty for now" detail="Check a homework page or answer a few practice problems. Each skill you use becomes a point on the map." action={{ label: "Start practicing", href: "/dashboard/practice" }} demo="skills" />
        </Sheet>
      )}
    </>
  );
}
