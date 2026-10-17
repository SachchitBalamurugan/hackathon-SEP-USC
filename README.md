# StudyLens

**Feedback while you work, not after the grade.** A browser extension and Claude connector that checks a student's homework on any page, teaches instead of telling, and builds a learner model that keeps getting better the more they use it.

## Team

- **Sachchit Balamurugan**
- **Philip Baker**

## Summary

**Problem.** Students use AI on almost everything: in 2026, 95% of UK undergraduates use AI and 94% use it on assessed work (HEPI 2026). But answers aren't learning. In a PNAS study of nearly a thousand students, those who practised with plain ChatGPT scored 17% worse once it was taken away; a tutor that hinted instead of answering avoided the drop (PNAS 2025). General chatbots also forget the student between conversations and know nothing about their courses.

**Solution.** StudyLens sits on top of the work students already do (Kami, PDFs, Google Docs, online problem sets):

- **Check my work:** one click screenshots the page, a vision model diagnoses the work, and the overlay circles mistakes in red, good steps in green, and handwriting it can't read in amber (it asks instead of guessing). It names the *belief* behind the error and asks one question rather than giving the answer.
- **Explain:** streamed explanations with steps, graphs and diagrams drawn on a whiteboard.
- **Practice:** problems aimed at the exact misconception, graded on the server (answer keys never reach the browser), spaced with SM-2 so they return before you forget.
- **A learner model** fed by three sources: course updates synced from Canvas and Google Classroom, what Claude learns in conversation (through our MCP connector), and how the student uses StudyLens.
- **Claude mode:** with no API key, the student's own Claude does the thinking through the connector, so StudyLens costs almost nothing to run per student.

Demo videos: a 2-minute pitch and a 3-minute live walkthrough (recordings of the real site, extension and MCP tools with a demo student's data). The setup walkthrough is also on the **Setup guide** page of the dashboard.

## How we addressed each track

### Grand Tech: Continual Learning

*Does it get better the more people use it? Is learning core?*

Learning is the product, not an add-on. Every check, practice answer, course sync and Claude observation lands in one append-only evidence log, `learner_events`.

- **Memory that stays honest:** skill mastery is recomputed on every read from `skill_demos` with a 14-day half-life, so stale wins fade and nothing drifts (`packages/core/src/mastery.ts`).
- **Consolidation:** every 25 events (and daily), `consolidate()` folds the log into structured traits and rewrites a short profile the tutor reads before teaching. Writes use an optimistic version check, so a student's own edit is never overwritten (`web/src/lib/learner.ts`).
- **Closed loop:** mistakes drive practice; practice results update mastery and SM-2 scheduling (`packages/core/src/srs.ts`); two correct answers in a row resolve the mistake. Claude reads the profile before teaching and writes back what it learns (`record_observation`, `log_learning_event`, `update_profile` in `web/src/lib/mcp.ts`).
- **A product that never learns couldn't do this:** a stateless checker can't tell "Maya always drops the sign when moving a term" from a one-off slip, can't time a review before she'd forget, and can't brief Claude on her before a session.
- **Getting better with more students (in progress):** every mark a student flags as wrong and every disputed grade is already recorded as a labelled example (`agent_runs`, `observed = true`). Next we cluster these into a shared misconception library and re-test the checker on them before any prompt or verifier change ships.

### Design: Best Visual Design

*Purpose clear at a glance, consistent identity, complex made simple, makes you come back.*

- **One click, three colours:** the overlay turns a whole tutoring session into red, green and amber marks on the student's own page, with one question to answer (`extension/components/MarksLayer.tsx`, `App.tsx`).
- **A consistent identity:** ink-on-white with a single blue accent, shared by the dashboard, the extension's shadow-DOM overlay and the demo videos.
- **Visual explanations:** a whiteboard renders steps, graphs and diagrams from validated draw operations (`extension/components/DrawView.tsx`, `packages/core/src/draw.ts`).
- **Reasons to come back:** a 3D skills map that turns green as you improve (`web/src/components/three/SkillsMap.tsx`), spaced reviews that come back on schedule, and an onboarding checklist plus Setup guide with a walkthrough video.

### Agents: Agent Behavior Monitoring

*What counts as failure, how the agent notices, guardrails and retries, reliability at scale.*

- **Failure, defined:** wrong feedback is the failure we design against. `packages/core/src/monitor.ts` lists every violation by severity: hard (timeout, refusal, schema mismatch, truncation), semantic (a summary saying "no mistakes" over red marks, duplicate or zero-size marks, a multiple-choice answer missing from its own options, an answer leaked in its question, a grade that contradicts its score, an over-long profile) and behavioural (a student flagging a mark or disputing a grade).
- **Noticing on its own:** every model step (check, refine, practice generation, grading, explanation, consolidation) runs through `watch()` in `web/src/lib/watchdog.ts`, which runs the verifiers on the output before the student sees it.
- **Guardrails and retries:** repairable problems get one retry with a written critique; whatever is left is patched (duplicates dropped, contradicting summaries rewritten) or dropped (unanswerable questions). Grade contradictions are settled deterministically. Unsure readings are marked amber and phrased as a question.
- **Reliability over time:** every run is logged to `agent_runs` with outcome, violations and latency. A per-pipeline circuit breaker skips the extra calls when more than 30% of recent runs fail, and the dashboard's Privacy page shows the student a 30-day "Tutor self-checks" summary. Claude's output in Claude mode passes the same verifiers.
- Tests: `test/monitor.test.ts`, `test/watchdog.test.ts`.

### Scale: Most Scalable to $1B

*Real problem, large market, path to a billion, would someone pay, why now.*

- **Market:** about 19 million US college students, and most already use AI for school. The same need exists in high school and internationally.
- **Why now:** AI made answers free. The next winner sells understanding, and the research above shows the difference is how the AI is designed.
- **Path:** students first (free trial, then a monthly plan), then schools and districts (site licences, with class-level insights planned), then every learner. The extension works on any homework page, so there is no per-platform integration to sell.
- **Unit economics:** in Claude mode the AI runs on the student's own Claude, so we never mark up usage and serving cost per student stays near zero. Course sync uses the student's own session, so no school integration is needed to start.
- **Moat:** the learner model and the labelled-mistake data compound with every student.

## Where to look (key files)

| Area | Files |
|---|---|
| Learner model and memory | `web/src/lib/learner.ts`, `packages/core/src/mastery.ts`, `packages/core/src/srs.ts`, `packages/core/src/lms/diff.ts` |
| Agent monitoring | `packages/core/src/monitor.ts`, `web/src/lib/watchdog.ts`, `supabase/migrations/20261017000000_agent_runs.sql` |
| Check my work | `web/src/lib/check.ts`, `packages/core/src/markup.ts`, `extension/components/App.tsx`, `extension/components/MarksLayer.tsx` |
| Claude connector (MCP) and Claude mode | `web/src/lib/mcp.ts`, `web/src/lib/claudeTasks.ts` |
| Dashboard | `web/src/app/dashboard/`, `web/src/components/three/SkillsMap.tsx` |
| Tests | `test/monitor.test.ts`, `test/watchdog.test.ts`, `test/mcp.test.ts`, `test/core.test.ts` |

Built with Next.js on Vercel, Supabase (Postgres + pgvector), a WXT Manifest V3 extension, Claude (vision, explanations, grading, memory), and the Model Context Protocol.

---

The rest of this README is the technical reference: how it works, setup, and development.

## Architecture

```
extension/      WXT (MV3) + React. Overlay in a shadow root on every page; worker holds the key.
web/            Next.js 16 on Vercel: dashboard, /api/*, and the MCP server at /api/mcp.
packages/core/  Pure, tested logic shared by both (schemas, SM-2, mastery, LMS mappers, parsers).
claude-plugin/  Claude Code plugin: remote MCP config plus a "tutor" skill.
supabase/       Database migration (Postgres + pgvector).
```

## How the learner model learns

| Input | Where it comes from | What it changes |
|---|---|---|
| Course updates | Each sync is diffed against the last: new work, moved deadlines, posted grades, missing work | `learner_events` (course) |
| Claude context | MCP tools `record_observation` and `log_learning_event` | `learner_events` (claude), `skill_demos` |
| Plugin usage | Checks, mark feedback, explanations, practice answers, and opt-in behaviour signals | `learner_events` (usage), `skill_demos`, `mistakes` |

Skill mastery is recomputed on every read from `skill_demos` with a 14-day half-life, so it never drifts. Every 25 events (and daily by cron), `consolidate()` folds new events into structured traits with Haiku 5.5 and rewrites the profile document with Sonnet 5.5, using an optimistic version check so a student's own edit is never overwritten.

## Claude mode: no API key needed

Leave `ANTHROPIC_API_KEY` unset and StudyLens makes no model calls of its own. Each student's own Claude does the thinking through the StudyLens connector (Claude Desktop, set up on **Connect**):

| Feature | What happens |
|---|---|
| Check my work | The extension uploads the screenshot and copies "Check my work with StudyLens". Claude calls `get_pending_check`, reads the screenshot, and posts marks with `submit_check_result`; they appear on the page a moment later. |
| Ask | The question (and screenshot, if shared) goes to Claude, which fetches the screen with `get_my_screen`. |
| Practice | Claude writes the set from `generate_practice_problems`' brief and saves it with `save_practice_problems`. StudyLens grades by exact or numeric match, or takes Claude's verdict. |
| Profile | Claude rewrites it with `update_profile`. |

Everything Claude sends back goes through the same watchdog checks as the server's own model output. A Claude.ai subscription can't be called from a server, which is why the work flows through the connector instead. With a key set, everything runs server-side as before.

## Setup

### 1. Supabase

Create a project at supabase.com, then run `supabase/migrations/20261016000000_init.sql` in the SQL editor (or `supabase db push`). Under Authentication > Providers > Email, either keep email confirmation on (links land on `/auth/callback`) or turn it off for a faster demo.

Every table has RLS on with no client policies: the browser can't read or write anything directly, and all access goes through server routes that use the service key and filter by the authenticated user.

### Quick local run on Windows

```powershell
powershell -ExecutionPolicy Bypass -File scripts\dev.ps1 -Seed
```

It installs packages, creates `web\.env.local` and opens it if missing, checks the values, applies any new `supabase\migrations` (with `SUPABASE_DB_URL` set), loads a demo account with three weeks of history (`-Seed`; log in as `demo@studylens.app` / `studylens-demo-2026`), starts the site and opens the Setup guide. On macOS or Linux: `npm run db:migrate`, `npm -w demo run seed`, `npm run dev:web`.

### 2. Web app

```bash
npm install
cp web/.env.example web/.env.local   # fill in Supabase keys; ANTHROPIC_API_KEY is optional (see Claude mode)
npm run dev:web                      # http://localhost:3000
```

`OPENAI_API_KEY` is optional and is used for embeddings only; without it, material search is full-text. All generation goes through Claude.

### 3. Extension

```bash
cp extension/.env.example extension/.env   # WXT_API_BASE=http://localhost:3000 (or your Vercel URL)
npm run dev:ext                            # opens Chrome with the extension loaded
# or: npm --workspace extension run build, then load extension/.output/chrome-mv3 unpacked
```

Sign in on the dashboard, open **Connect**, get a pairing code, and enter it in the extension popup.

Students install from **Connect → Download extension**, served by `web/src/app/studylens-extension.zip/route.ts` from the prebuilt `web/extension/studylens-extension.zip` with the site's own address filled in. After changing anything in `extension/`, run `npm run build:ext-zip` and commit the new zip. The full walkthrough video lives on **Setup guide** in the dashboard.

### 4. Claude

On **Connect**, create an MCP key. Then use one of these:

- **Claude Code:** `claude mcp add --transport http studylens <site>/api/mcp --header "Authorization: Bearer <key>"`
- **Claude Code plugin:** set `STUDYLENS_URL` and `STUDYLENS_KEY`, then `claude plugin install ./claude-plugin`. It adds the server and the tutor skill.
- **Claude Desktop:** paste the `mcp-remote` snippet from the Connect page into `claude_desktop_config.json`.

### 5. Deploy to Vercel

Import the repo with Root Directory `web`, add the variables from `web/.env.example` (including a random `CRON_SECRET`), and deploy. `web/vercel.json` schedules the daily consolidation. Rebuild the extension with `WXT_API_BASE` set to the deployed URL.

## Using it

- **Check my work** (dock button, or Alt+Shift+C): screenshots the tab, finds and diagnoses mistakes, circles them on the page, then re-locates each error in a zoomed crop so the marks slide into place. Marks follow the page as it scrolls, including inner scroll containers like Kami's.
- **Ask:** streamed explanations that can include your screen; diagrams, graphs and worked steps animate in.
- **Practice:** problems targeted at your open mistakes and weak skills, graded server-side (answer keys never reach the browser), scheduled with SM-2. Two correct answers in a row resolve the mistake.
- **Today:** what's due, the assignment this page probably belongs to, skills to work on, and per-site switches for auto-check and learning signals.

## Privacy

- Behaviour signals are **off by default**. When on, they record time active and idle, scroll depth, tab switches, pen strokes on drawing surfaces, and counts of delete/undo bursts. They never record keystrokes, text, field values or page content.
- Nothing runs at all on email, banking, health, sign-in or password-manager sites.
- Screenshots are taken only when you press Check, ask with "Include my screen", or turn on auto-check for a site. They are sent to the model and not stored.
- The dashboard has export and delete for everything StudyLens has stored about you, and you can edit the profile directly.

## Development

```bash
npm test               # unit tests: core logic, expression parser, MCP protocol surface
npm run eval:check     # live vision eval over eval/fixtures (spends API credits)
npm --workspace web run typecheck && npm --workspace extension run typecheck
```

### Demo videos

The videos on the landing page and in each "How this works" dialog come from `demo/`:

```bash
DEMO_MODE=1 npx --workspace web next dev -p 3100   # staged Canvas API on, in another terminal
npm -w demo run record                             # seeds the demo account, records out/raw/<scene>.webm + cues
npm -w demo run render                             # Remotion -> web/public/demos/<key>.mp4/.webm/.jpg
npm -w demo run studio                             # preview and tweak the compositions
```

**Live walkthrough with demo data.** `DEMO_FIXTURES=1` (development only, never on a production build) runs the real site against an in-memory database seeded with a demo student (Maya, `maya@studylens.demo`, any password), with prepared model answers for the demo worksheet; `DEMO_CLAUDE_MODE=1` switches it to Claude mode. `demo/live.ts` drives the site and the real extension in a headed Chrome and records the screen with ffmpeg; `demo/walkthrough.ts` cuts the recordings into `out/walkthrough.mp4` with chapter cards and captions. See the comment at the top of `live.ts` for the exact commands.

`intro`, `learning` and `claude` are drawn entirely in Remotion and render without a backend. The other six wrap a screen recording and are skipped until it exists. Set `REMOTION_BROWSER` to an existing headless Chrome to skip Remotion's download.
