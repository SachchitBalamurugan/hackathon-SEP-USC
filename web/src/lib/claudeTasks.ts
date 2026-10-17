import "server-only";
import { db } from "./supabase";

// Claude-mode handoff queue (supabase/migrations/20261018000000_claude_tasks.sql). One pending
// task per kind per student: a new screenshot replaces the one Claude hasn't picked up yet.

export type TaskKind = "check" | "ask";
export type ClaudeTask = { id: string; kind: TaskKind; status: "pending" | "done"; host: string; question: string | null; image: string | null; result: unknown; created_at: string };

const STALE_MS = 60 * 60_000;

export async function queueTask(userId: string, kind: TaskKind, t: { image?: string; host?: string; question?: string }): Promise<string> {
  await db().from("claude_tasks").delete().eq("user_id", userId).eq("kind", kind).eq("status", "pending");
  const { data, error } = await db()
    .from("claude_tasks")
    .insert({ user_id: userId, kind, host: (t.host ?? "").slice(0, 120), question: t.question?.slice(0, 4000) ?? null, image: t.image ?? null })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** The newest pending task (of one kind, or any) from the last hour. */
export async function latestTask(userId: string, kind?: TaskKind): Promise<ClaudeTask | null> {
  let q = db()
    .from("claude_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .gte("created_at", new Date(Date.now() - STALE_MS).toISOString());
  if (kind) q = q.eq("kind", kind);
  const { data } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as ClaudeTask | null) ?? null;
}

export async function getTask(userId: string, id: string): Promise<Pick<ClaudeTask, "id" | "status" | "result"> | null> {
  const { data } = await db().from("claude_tasks").select("id, status, result").eq("id", id).eq("user_id", userId).maybeSingle();
  return data as Pick<ClaudeTask, "id" | "status" | "result"> | null;
}

/** Store the result and drop the screenshot; it was only kept for Claude to look at. */
export async function finishTask(userId: string, id: string, result: unknown) {
  await db().from("claude_tasks").update({ status: "done", result, image: null, done_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
}
