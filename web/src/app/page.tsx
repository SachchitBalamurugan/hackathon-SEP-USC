import Link from "next/link";

const FEATURES = [
  { title: "Reads your courses", body: "Syncs assignments, deadlines, grades and materials from Canvas and Google Classroom through your own browser session." },
  { title: "Checks your work anywhere", body: "On Kami, a PDF or an online problem set, press Check and it circles the mistake and asks the question that fixes the misunderstanding." },
  { title: "Teaches with visuals", body: "Explanations arrive as step-by-step animations, graphs and diagrams, overlaid on the page you're on." },
  { title: "Learns how you learn", body: "Every check, practice answer and Claude conversation updates a profile of what you know, where you get stuck, and how you learn best." },
  { title: "Plugs into Claude", body: "An MCP server gives Claude your courses, mastery and mistakes, and lets it write back what it learns about you." },
  { title: "Practice that targets you", body: "Problems written for the exact misconception behind your last mistake, scheduled with spaced repetition." },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
      <p className="text-sm font-medium text-accent">StudyLens</p>
      <h1 className="mt-2 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">A tutor that learns how you learn, on any page you study on.</h1>
      <p className="mt-4 max-w-xl text-lg text-muted">A browser extension and a Claude connector that know your courses, watch for mistakes as you work, and teach you in an overlay.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="btn" href="/login">
          Get started
        </Link>
        <Link className="btn btn-ghost" href="/dashboard">
          Open dashboard
        </Link>
      </div>
      <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="card">
            <h2 className="font-medium">{f.title}</h2>
            <p className="mt-2 text-sm text-muted">{f.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
