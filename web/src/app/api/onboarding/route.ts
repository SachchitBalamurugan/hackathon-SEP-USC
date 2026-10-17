import { json, route } from "@/lib/route";
import { getOnboarding } from "@/lib/overview";

// Polled by the Connect page so each step ticks the moment it happens.
export const GET = route(["session"], async (req, { userId }) => json(req, await getOnboarding(userId)));
