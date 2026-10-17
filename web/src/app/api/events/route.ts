import { eventBatchSchema, USAGE_KINDS } from "@studylens/core";
import { body, json, OPTIONS, route } from "@/lib/route";
import { recordDemo, recordEvents } from "@/lib/learner";
import { db } from "@/lib/supabase";

// Behaviour and overlay-usage events from the extension. Only the "usage" source is accepted
// here: course events come from ingest diffs and claude events from MCP tools.

export const POST = route(["extension", "session"], async (req, { userId }) => {
  const { events } = await body(req, eventBatchSchema);
  const { data: profile } = await db().from("profiles").select("tracking_enabled").eq("id", userId).maybeSingle();

  const accepted = events.filter((e) => {
    if (e.source !== "usage" || !(USAGE_KINDS as readonly string[]).includes(e.kind)) return false;
    // Passive behaviour signals need the opt-in; direct overlay feedback does not.
    const passive = e.kind === "focus_session" || e.kind === "rewrite_burst";
    return !passive || profile?.tracking_enabled === true;
  });
  await recordEvents(userId, accepted);

  // "That mark was wrong" is evidence the student was right about that skill.
  for (const e of accepted) {
    if (e.kind === "mark_feedback" && e.payload.verdict === "wrong" && typeof e.payload.skill === "string") {
      await recordDemo(userId, e.payload.skill, true, "mark-dispute", 0.5);
    }
  }
  return json(req, { accepted: accepted.length, dropped: events.length - accepted.length });
});

export { OPTIONS };
