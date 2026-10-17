import { requireUser } from "@/lib/session";
import { db } from "@/lib/supabase";
import { getReliability } from "@/lib/overview";
import { TopBar } from "@/components/shell/TopBar";
import { Row, Sheet } from "@/components/ui";
import { DeleteData, PrivacyControls } from "./PrivacyControls";

export const metadata = { title: "Privacy" };

const NEVER = [
  "What you type, or the text on any page",
  "Passwords and form fields",
  "Anything on email, banking, health, sign-in or password-manager sites",
  "Screenshots, which are sent to the tutor only when you ask and never stored",
];

const STEP: Record<string, string> = {
  check: "Check my work",
  refine: "Placing marks",
  practice_generate: "Writing practice",
  practice_grade: "Grading answers",
  explain: "Explanations",
  consolidate: "Updating your profile",
};

const ISSUE: Record<string, string> = {
  timeout: "took too long",
  api_error: "couldn't reach the tutor",
  refusal: "the tutor declined",
  schema_mismatch: "came back malformed",
  truncated: "got cut off",
  mark_zero_area: "a mark too small to see",
  mark_duplicate: "the same mark twice",
  mark_missing_note: "a mark without a note",
  summary_contradicts_marks: "a summary that disagreed with the marks",
  refine_not_found: "couldn't find the spot to mark",
  refine_jumped: "a mark that moved too far",
  mc_answer_not_in_options: "an answer missing from its choices",
  mc_option_count: "the wrong number of choices",
  mc_duplicate_options: "a repeated choice",
  question_count: "too few questions",
  answer_leaked: "a question that showed its answer",
  short_answer_has_options: "choices on a typed question",
  grade_contradiction: "a grade that contradicted itself",
  grade_empty_feedback: "a grade with no feedback",
  draw_ops_rejected: "a diagram that failed to draw",
  mind_doc_too_long: "a profile that ran long",
  version_conflict: "two updates at once",
  user_flagged_mark: "you said a mark was wrong",
  user_disputed_grade: "you disputed a grade",
};

export default async function Privacy() {
  const user = await requireUser();
  const [{ data }, health] = await Promise.all([db().from("profiles").select("tracking_enabled, paused_hosts").eq("id", user.id).maybeSingle(), getReliability(user.id)]);
  return (
    <>
      <TopBar title="Privacy" description="You decide what StudyLens learns from, and you can take it all with you or delete it." />
      <div className="mx-auto grid max-w-3xl gap-6">
        <Sheet title="Learning from how you work" meta="Off unless you turn it on.">
          <div className="p-5">
            <p className="text-[14px] text-ink-2">
              With this on, the extension notices time on task, idle time, switching away, and how often you rewrite an answer, so StudyLens can tell when you are stuck and how you focus best.
            </p>
            <PrivacyControls initialEnabled={data?.tracking_enabled ?? false} initialPaused={data?.paused_hosts ?? []} />
          </div>
        </Sheet>
        <Sheet title="Never collected">
          {NEVER.map((n) => (
            <div key={n} className="row">
              <span className="mark mark-good" />
              <span className="text-[14px]">{n}</span>
            </div>
          ))}
        </Sheet>
        <Sheet title="Tutor self-checks" meta="Every answer is checked before you see it. Fixable problems are retried once; the rest are patched or dropped. Last 30 days.">
          {health.length ? (
            health.map((h) => {
              const caught = h.repaired + h.degraded;
              return (
                <Row
                  key={h.pipeline}
                  mark={h.failed ? "danger" : caught || h.reported ? "warn" : "good"}
                  title={STEP[h.pipeline] ?? h.pipeline}
                  subtitle={
                    h.topIssue
                      ? `Most common: ${ISSUE[h.topIssue] ?? h.topIssue}${h.reported ? ` · ${h.reported} reported by you` : ""}`
                      : "No problems found"
                  }
                  meta={`${h.runs - caught - h.failed}/${h.runs} clean${caught ? `, ${caught} fixed` : ""}${h.failed ? `, ${h.failed} failed` : ""}`}
                />
              );
            })
          ) : (
            <p className="t-meta p-5">Nothing yet. Results appear after your first check or practice set.</p>
          )}
        </Sheet>
        <Sheet title="Your data" meta="Deleting keeps your account but clears courses, skills, mistakes, practice and your profile.">
          <div className="flex flex-wrap gap-3 p-5">
            <a className="btn btn-secondary" href="/api/me">
              Export my data
            </a>
            <DeleteData />
          </div>
        </Sheet>
      </div>
    </>
  );
}
