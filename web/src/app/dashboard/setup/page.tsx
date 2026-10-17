import Link from "next/link";
import { Check } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getOnboarding } from "@/lib/overview";
import { DEMOS } from "@/lib/demos";
import { TopBar } from "@/components/shell/TopBar";
import { DemoVideo } from "@/components/DemoVideo";
import { Sheet } from "@/components/ui";
import { STEPS, stepDone } from "@/components/SetupChecklist";

export const metadata = { title: "Setup guide" };

// The onboarding walkthrough students can come back to: the setup video, where each step
// stands for them right now, and fixes for the problems people actually hit.

const FIXES: { q: string; a: string }[] = [
  {
    q: "The extension download fails",
    a: "Download it from Connect while signed in to this site, not from a saved link. The zip is built for the site you download it from, so a copy from another StudyLens address won't pair here.",
  },
  {
    q: "Chrome says the manifest file is missing",
    a: "Unzip first, then pick the studylens folder itself in Load unpacked (the one that contains manifest.json), not the zip or its parent folder.",
  },
  { q: "The pairing code doesn't work", a: "Codes last five minutes and work once. Press New code on Connect and type the fresh one into the extension popup." },
  {
    q: "Claude Desktop doesn't show StudyLens",
    a: "Use the key from Create a Claude key (it starts with sl_), not the pairing code. Copy the config from Connect as-is, keep this site running, then quit Claude fully from the tray or menu bar and reopen it.",
  },
  { q: "My courses didn't sync", a: "Open your Canvas dashboard or Google Classroom with the extension on and stay on the page for a few seconds. Courses then appear under Courses." },
];

export default async function SetupGuide() {
  const user = await requireUser();
  const status = await getOnboarding(user.id);
  const complete = STEPS.filter((s) => stepDone(status, s.key)).length;
  return (
    <>
      <TopBar title="Setup guide" description="Everything from creating your account to connecting Claude, in under a minute. Come back any time." />
      <div className="mx-auto grid max-w-4xl gap-6">
        <section className="sheet p-3 sm:p-4">
          <DemoVideo demo="setup" controls />
          <p className="t-meta px-1 pt-3">{DEMOS.setup.caption}</p>
        </section>

        <Sheet title="Your progress" meta={`${complete} of ${STEPS.length} done. Each step ticks off by itself.`} action={<Link href="/dashboard/connect" className="btn btn-sm">Open Connect</Link>}>
          <ol>
            {STEPS.map((s, i) => {
              const done = stepDone(status, s.key);
              return (
                <li key={s.key} className="row">
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold ${done ? "bg-good text-white" : "border border-line-strong text-dim"}`}>
                    {done ? <Check size={13} strokeWidth={3} /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-[14px] font-medium ${done ? "text-dim" : ""}`}>{s.title}</div>
                    <div className="t-meta">{s.detail}</div>
                  </div>
                  {!done && s.action && (
                    <Link href={s.action.href} className="btn btn-secondary btn-sm">
                      {s.action.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </Sheet>

        <Sheet title="If something isn't working">
          {FIXES.map((f) => (
            <details key={f.q} className="group border-b border-line last:border-0">
              <summary className="row cursor-pointer list-none text-[14px] font-medium [&::-webkit-details-marker]:hidden">
                <span className="flex-1">{f.q}</span>
                <span className="text-dim transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="t-meta px-5 pb-4">{f.a}</p>
            </details>
          ))}
        </Sheet>
      </div>
    </>
  );
}
