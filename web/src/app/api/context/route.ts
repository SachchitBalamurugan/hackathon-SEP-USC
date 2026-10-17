import { json, OPTIONS, route } from "@/lib/route";
import { getMastery, getOpenMistakes, getProfile, getUpcoming } from "@/lib/learner";
import { db } from "@/lib/supabase";

// What the overlay dock shows: due work, weak and strong skills, open mistakes, and the
// student's tracking settings so the extension honours them.

export const GET = route(["extension", "session"], async (req, { userId }) => {
  const [mastery, upcoming, mistakes, profile, { data: settings }] = await Promise.all([
    getMastery(userId),
    getUpcoming(userId, 14),
    getOpenMistakes(userId, 10),
    getProfile(userId),
    db().from("profiles").select("tracking_enabled, paused_hosts, auto_check_hosts").eq("id", userId).maybeSingle(),
  ]);
  return json(req, {
    upcoming,
    mistakes,
    weak: mastery.filter((m) => m.status === "shaky" || m.level < 0.6).slice(0, 6),
    strong: mastery.filter((m) => m.status === "verified").slice(-6),
    profile: { summary: profile.mind_doc.slice(0, 600), updatedAt: profile.updated_at },
    settings: settings ?? { tracking_enabled: false, paused_hosts: [], auto_check_hosts: [] },
  });
});

export { OPTIONS };
