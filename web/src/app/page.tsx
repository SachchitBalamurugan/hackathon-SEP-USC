import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Logo } from "@/components/Logo";
import { DemoVideo } from "@/components/DemoVideo";
import { DEMOS, type DemoKey } from "@/lib/demos";
import { Hero3D } from "./Hero3D";

const FEATURES: { demo: DemoKey; title: string; body: string; points: string[] }[] = [
  {
    demo: "check",
    title: "Checks your work on any page",
    body: "On Kami, a PDF, Google Docs or an online problem set, press Check. StudyLens circles the mistake right on the page and asks the one question that fixes the thinking behind it.",
    points: ["Finds the belief behind the error, not just the error", "Marks follow the page as you scroll", "Says so when it can't read your writing"],
  },
  {
    demo: "ask",
    title: "Explains with visuals you can watch",
    body: "Ask about anything on your screen. Answers arrive with worked steps, graphs and diagrams that animate in, pitched to how you learn.",
    points: ["Sees your screen when you allow it", "Grounded in your own course materials", "Guides you instead of handing over answers"],
  },
  {
    demo: "practice",
    title: "Practice written for your mistakes",
    body: "Every set targets the misconception behind something you got wrong, then comes back on a spaced schedule so it sticks.",
    points: ["Graded on the server, so answers stay hidden", "Two right in a row clears a mistake", "Reviews arrive right before you'd forget"],
  },
  {
    demo: "sync",
    title: "Knows your courses",
    body: "Open Canvas or Google Classroom once. Deadlines, grades and course pages sync through your own login, with no school setup.",
    points: ["Canvas and Google Classroom", "Notices new work, moved deadlines and grades", "No tokens or admin approval"],
  },
  {
    demo: "claude",
    title: "Works inside Claude",
    body: "Connect StudyLens to Claude and it reads your profile before it teaches, then saves what it learns about you for next time.",
    points: ["Your skills, mistakes and deadlines in every chat", "One command in Claude Code", "Works with Claude Desktop too"],
  },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-ground">
      <header className="sticky top-0 z-30 border-b border-line bg-ground/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center gap-6 px-4 sm:px-6">
          <Link href="/" aria-label="StudyLens home">
            <Logo />
          </Link>
          <nav className="hidden gap-6 text-[14px] text-ink-2 md:flex">
            <a href="#how" className="hover:text-ink">
              How it works
            </a>
            <a href="#learns" className="hover:text-ink">
              How it learns
            </a>
            <a href="#privacy" className="hover:text-ink">
              Privacy
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
            <Link href="/login?mode=signup" className="btn btn-sm">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-[1180px] items-center gap-8 px-4 pb-12 pt-12 sm:px-6 md:pt-20 lg:grid-cols-[480px_1fr] lg:gap-4">
          <div className="rise">
            <h1 className="text-[clamp(40px,5.4vw,64px)] font-[650] leading-[1.04] tracking-[-0.035em]">A tutor that learns how you learn.</h1>
            <p className="mt-5 max-w-[44ch] text-[18px] leading-[28px] text-ink-2">
              StudyLens knows your courses, checks your homework on any page, and teaches you in an overlay right where you&apos;re working.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login?mode=signup" className="btn btn-lg">
                Get started free <ArrowRight size={16} />
              </Link>
              <a href="#how" className="btn btn-secondary btn-lg">
                Watch the demo
              </a>
            </div>
            <p className="t-meta mt-4">Free for students. Works in Chrome, Edge, Arc and Brave.</p>
          </div>
          <div className="relative h-[420px] sm:h-[520px] lg:h-[600px]">
            <Hero3D />
          </div>
        </section>

        {/* Intro video */}
        <section className="mx-auto w-full max-w-[1180px] px-4 pb-20 sm:px-6">
          <div className="card overflow-hidden p-2 sm:p-3">
            <DemoVideo demo="intro" />
          </div>
        </section>

        {/* Features */}
        <section id="how" className="scroll-mt-20 border-t border-line bg-sunken/50">
          <div className="mx-auto w-full max-w-[1180px] px-4 py-20 sm:px-6">
            <h2 className="t-title max-w-[22ch]">See it work</h2>
            <p className="mt-2 max-w-[56ch] text-ink-2">Each clip is the real product on a real worksheet. Captions walk you through it.</p>
            <div className="mt-12 grid gap-16">
              {FEATURES.map((f, i) => (
                <article key={f.demo} className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                  <div className="card overflow-hidden p-2">
                    <DemoVideo demo={f.demo} />
                  </div>
                  <div>
                    <h3 className="t-title">{f.title}</h3>
                    <p className="mt-3 text-[16px] leading-[26px] text-ink-2">{f.body}</p>
                    <ul className="mt-5 space-y-2.5">
                      {f.points.map((p) => (
                        <li key={p} className="flex gap-3 text-[15px]">
                          <Check size={18} strokeWidth={2.2} className="mt-0.5 shrink-0 text-good" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it learns */}
        <section id="learns" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto grid w-full max-w-[1180px] items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.15fr]">
            <div>
              <h2 className="t-title">{DEMOS.learning.title}</h2>
              <p className="mt-3 text-[16px] leading-[26px] text-ink-2">Three things feed one profile that every part of StudyLens, and Claude, reads before it teaches you.</p>
              <div className="sheet mt-6">
                {[
                  ["Your courses", "New assignments, moved deadlines and posted grades"],
                  ["Your work", "Checked homework, practice answers, and how you work when you allow it"],
                  ["Claude", "What Claude notices about you in conversation"],
                ].map(([t, d]) => (
                  <div key={t} className="row">
                    <span className="mark mark-good" />
                    <div>
                      <div className="text-[14px] font-medium">{t}</div>
                      <div className="t-meta">{d}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="t-meta mt-4">Recent evidence counts most. Asking about a topic never counts as being bad at it. You can read and edit your profile any time.</p>
            </div>
            <div className="card overflow-hidden p-2">
              <DemoVideo demo="learning" />
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section id="privacy" className="scroll-mt-20 border-t border-line bg-sunken/50">
          <div className="mx-auto grid w-full max-w-[1180px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
            <div>
              <h2 className="t-title">Private by default</h2>
              <p className="mt-3 max-w-[48ch] text-[16px] leading-[26px] text-ink-2">StudyLens learns from your schoolwork, not your life. Everything beyond checking your work is opt-in, and you can export or delete it all.</p>
            </div>
            <div className="sheet">
              {[
                "Never records what you type or what's on a page",
                "Never runs on email, banking, health or password sites",
                "Screenshots only when you press Check, never stored",
                "Export or delete your data in one click",
              ].map((t) => (
                <div key={t} className="row">
                  <Check size={16} strokeWidth={2.4} className="shrink-0 text-good" />
                  <span className="text-[14px]">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-line">
          <div className="mx-auto flex w-full max-w-[1180px] flex-col items-start gap-6 px-4 py-20 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="t-title">Start with your next assignment.</h2>
              <p className="mt-2 text-ink-2">Set up takes about two minutes.</p>
            </div>
            <Link href="/login?mode=signup" className="btn btn-lg">
              Get started free <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-4 px-4 py-8 text-[13px] text-dim sm:px-6">
          <Logo size={22} />
          <span>Built on Claude. Made for students.</span>
        </div>
      </footer>
    </div>
  );
}
