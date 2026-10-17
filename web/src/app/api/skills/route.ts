import { json, route } from "@/lib/route";
import { getSkillGraph } from "@/lib/overview";

export const GET = route(["session"], async (req, { userId }) => json(req, await getSkillGraph(userId)));
