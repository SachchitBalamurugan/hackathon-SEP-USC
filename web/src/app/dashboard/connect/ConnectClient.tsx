"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, Download } from "lucide-react";
import type { Onboarding } from "@/lib/overview";

async function post(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
}

function Step({ n, id, title, done, active, children }: { n: number; id: string; title: string; done: boolean; active: boolean; children: ReactNode }) {
  return (
    <section id={id} className={`sheet scroll-mt-24 ${active ? "ring-1 ring-ink/10" : ""}`}>
      <div className="flex gap-4 p-5 sm:p-6">
        <span className={`grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${done ? "bg-good text-white" : active ? "bg-ink text-white" : "border border-line-strong text-dim"}`}>
          {done ? <Check size={14} strokeWidth={3} /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="t-heading">{title}</h2>
          <div className="mt-2">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Copyable({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3">
      {label && <div className="t-label mb-1.5">{label}</div>}
      <div className="flex items-stretch overflow-hidden rounded-[var(--r-control)] border border-line-strong bg-sunken">
        <pre className="min-w-0 flex-1 overflow-x-auto px-3 py-2.5 font-mono text-[12.5px] leading-5 text-ink">{text}</pre>
        <button
          className="flex shrink-0 items-center gap-1.5 border-l border-line-strong bg-surface px-3 text-[13px] font-medium hover:bg-sunken"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function PairCode({ paired }: { paired: boolean }) {
  const [code, setCode] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!left) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  if (paired && !code) return <p className="t-meta">Your extension is paired. Pair another browser any time with a new code.</p>;
  return (
    <div className="flex flex-wrap items-center gap-4">
      {code && left > 0 ? (
        <>
          <code className="rounded-[var(--r-inner)] border border-line-strong bg-sunken px-5 py-3 font-mono text-[28px] font-semibold tracking-[0.28em] text-ink" aria-live="polite">
            {code}
          </code>
          <span className="t-meta tabular-nums">
            Expires in {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
          </span>
        </>
      ) : null}
      <button
        className={`btn ${code && left > 0 ? "btn-secondary btn-sm" : ""}`}
        onClick={async () => {
          const r = await post("/api/pair", { action: "issue" });
          setCode(r.code ?? null);
          setLeft(r.expiresInSeconds ?? 300);
        }}
      >
        {code && left > 0 ? "New code" : paired ? "Pair another browser" : "Get pairing code"}
      </button>
    </div>
  );
}

function ClaudeSetup({ mcpUrl }: { mcpUrl: string }) {
  const [key, setKey] = useState<string | null>(null);
  const [tab, setTab] = useState<"code" | "desktop">("code");
  const token = key ?? "YOUR_KEY";
  return (
    <div>
      {!key ? (
        <button
          className="btn"
          onClick={async () => {
            const r = await post("/api/keys", { label: "Claude" });
            setKey(r.key);
          }}
        >
          Create a Claude key
        </button>
      ) : (
        <p className="text-[14px] text-warn">Copy your key now. For your security it is shown only once.</p>
      )}
      <div role="tablist" className="mt-4 inline-flex overflow-hidden rounded-[10px] border border-line-strong">
        {(
          [
            ["code", "Claude Code"],
            ["desktop", "Claude Desktop"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`h-8 px-3.5 text-[13px] ${tab === id ? "bg-ink font-semibold text-white" : "text-ink-2 hover:bg-sunken"}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === "code" ? (
        <Copyable label="Run in your terminal" text={`claude mcp add --transport http studylens ${mcpUrl} --header "Authorization: Bearer ${token}"`} />
      ) : (
        <Copyable
          label="Add to claude_desktop_config.json"
          // The header value goes through env: on Windows, Claude Desktop splits args at spaces.
          text={JSON.stringify(
            { mcpServers: { studylens: { command: "npx", args: ["-y", "mcp-remote", mcpUrl, "--header", "Authorization:${AUTH_HEADER}"], env: { AUTH_HEADER: `Bearer ${token}` } } } },
            null,
            2,
          )}
        />
      )}
      <p className="t-meta mt-3">Then ask Claude something like &quot;tutor me on what I got wrong this week&quot;. This step ticks off after Claude&apos;s first call.</p>
    </div>
  );
}

export function ConnectSteps({ initial, mcpUrl }: { initial: Onboarding; mcpUrl: string }) {
  const [status, setStatus] = useState(initial);
  useEffect(() => {
    const t = setInterval(async () => {
      const r = await fetch("/api/onboarding").then((x) => (x.ok ? x.json() : null)).catch(() => null);
      if (r) setStatus(r);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const active = !status.extension ? 2 : !status.claude ? 3 : 0;
  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <Step n={1} id="extension" title="Install the browser extension" done={status.extension} active={!status.extension}>
        <p className="t-meta">Works in Chrome, Edge, Arc and Brave.</p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[14px] text-ink-2">
          <li>Download the extension and unzip it.</li>
          <li>
            Open <code className="rounded bg-sunken px-1.5 py-0.5 text-[13px]">chrome://extensions</code> and turn on <strong className="text-ink">Developer mode</strong>.
          </li>
          <li>
            Click <strong className="text-ink">Load unpacked</strong> and pick the unzipped folder. Pin StudyLens to your toolbar.
          </li>
        </ol>
        <a className="btn btn-secondary mt-4" href="/studylens-extension.zip" download>
          <Download size={15} /> Download extension
        </a>
      </Step>
      <Step n={2} id="pair" title="Pair it with your account" done={status.extension} active={active === 2}>
        <p className="t-meta mb-3">Click the StudyLens icon in your toolbar and type this code.</p>
        <PairCode paired={status.extension} />
      </Step>
      <Step n={3} id="claude" title={status.claudeMode ? "Connect Claude" : "Connect Claude (optional)"} done={status.claude} active={active === 3}>
        <p className="t-meta mb-3">
          {status.claudeMode
            ? "Required: StudyLens runs on your own Claude. It checks your work, answers your questions and writes your practice, using what StudyLens knows about you. Use Claude Desktop, and keep it connected."
            : "Claude can then see your courses, skills and mistakes, and save what it learns about how you learn."}
        </p>
        <ClaudeSetup mcpUrl={mcpUrl} />
      </Step>
    </div>
  );
}
