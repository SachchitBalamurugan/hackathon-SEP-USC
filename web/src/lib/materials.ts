import "server-only";
import { createHash } from "node:crypto";
import { chunkText, diffAssignments, type LmsSnapshot } from "@studylens/core";
import { db } from "./supabase";
import { embed, toVector } from "./embed";
import { recordEvents } from "./learner";

// Course data from the extension: upsert courses and assignments, turn what changed into
// course events for the learner model, and chunk + embed materials for retrieval.

export async function ingestSnapshot(userId: string, snap: LmsSnapshot) {
  const now = new Date().toISOString();

  // Courses first, so assignments and materials can link to them.
  const courseIds = new Map<string, string>();
  if (snap.courses.length) {
    const { data, error } = await db()
      .from("courses")
      .upsert(
        snap.courses.map((c) => ({
          user_id: userId,
          external_id: c.externalId,
          source: c.source,
          name: c.name,
          code: c.code,
          current_score: c.currentScore,
          url: c.url,
          updated_at: now,
        })),
        { onConflict: "user_id,external_id" },
      )
      .select("id, external_id");
    if (error) throw error;
    for (const r of data ?? []) courseIds.set(r.external_id, r.id);
  }
  // Assignments can reference courses synced in an earlier batch.
  const missing = [...new Set([...snap.assignments, ...snap.materials].map((a) => a.courseExternalId))].filter((id) => !courseIds.has(id));
  if (missing.length) {
    const { data } = await db().from("courses").select("id, external_id").eq("user_id", userId).in("external_id", missing);
    for (const r of data ?? []) courseIds.set(r.external_id, r.id);
  }

  let events = 0;
  if (snap.assignments.length) {
    const ids = snap.assignments.map((a) => a.externalId);
    const { data: before } = await db()
      .from("assignments")
      .select("external_id, title, due_at, score, missing, submitted_at")
      .eq("user_id", userId)
      .in("external_id", ids);
    const changes = diffAssignments(
      (before ?? []).map((b) => ({ externalId: b.external_id, title: b.title, dueAt: b.due_at, score: b.score === null ? null : Number(b.score), missing: b.missing, submittedAt: b.submitted_at })),
      snap.assignments,
    );
    const { error } = await db()
      .from("assignments")
      .upsert(
        snap.assignments.map((a) => ({
          user_id: userId,
          course_id: courseIds.get(a.courseExternalId) ?? null,
          external_id: a.externalId,
          title: a.title,
          description: a.description,
          due_at: a.dueAt,
          points_possible: a.pointsPossible,
          score: a.score,
          submitted_at: a.submittedAt,
          missing: a.missing,
          url: a.url,
          updated_at: now,
        })),
        { onConflict: "user_id,external_id" },
      );
    if (error) throw error;
    // A first sync of a whole LMS is not news; only report changes once we have a baseline.
    const meaningful = (before ?? []).length ? changes : changes.filter((c) => c.kind === "grade_posted");
    if (meaningful.length) {
      await recordEvents(
        userId,
        meaningful.slice(0, 50).map((c) => ({ source: "course" as const, kind: c.kind, payload: c as unknown as Record<string, unknown> })),
      );
      events = meaningful.length;
    }
  }

  let chunks = 0;
  for (const m of snap.materials.slice(0, 40)) chunks += await ingestMaterial(userId, courseIds.get(m.courseExternalId) ?? null, m);

  return { courses: snap.courses.length, assignments: snap.assignments.length, materials: snap.materials.length, chunks, events };
}

async function ingestMaterial(userId: string, courseId: string | null, m: LmsSnapshot["materials"][number]) {
  const text = m.text.slice(0, 200_000);
  if (text.trim().length < 40) return 0;
  const hash = createHash("sha256").update(text).digest("hex");
  const { data: existing } = await db().from("materials").select("id, content_hash").eq("user_id", userId).eq("external_id", m.externalId).maybeSingle();
  if (existing?.content_hash === hash) return 0;

  const { data: mat, error } = await db()
    .from("materials")
    .upsert(
      { user_id: userId, course_id: courseId, external_id: m.externalId, title: m.title, kind: m.kind, url: m.url, content_hash: hash, updated_at: new Date().toISOString() },
      { onConflict: "user_id,external_id" },
    )
    .select("id")
    .single();
  if (error) throw error;

  const pieces = chunkText(`${m.title}\n\n${text}`).slice(0, 200);
  const vectors = await embed(pieces);
  await db().from("material_chunks").delete().eq("material_id", mat.id);
  const { error: insErr } = await db()
    .from("material_chunks")
    .insert(pieces.map((t, idx) => ({ material_id: mat.id, user_id: userId, idx, text: t, embedding: vectors ? toVector(vectors[idx]) : null })));
  if (insErr) throw insErr;
  return pieces.length;
}

export async function searchMaterials(userId: string, query: string, k = 6): Promise<{ text: string; materialId: string; score: number }[]> {
  if (!query.trim()) return [];
  const vec = await embed([query]).catch(() => null);
  const { data, error } = await db().rpc("search_material_chunks", {
    p_user: userId,
    p_query: query,
    p_embedding: vec ? toVector(vec[0]) : null,
    p_k: k,
  });
  if (error) {
    console.error("search_material_chunks", error);
    return [];
  }
  return (data ?? []).map((r: any) => ({ text: r.text, materialId: r.material_id, score: r.score }));
}
