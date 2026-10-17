"use client";

import { useState } from "react";
import { X } from "lucide-react";

async function save(patch: Record<string, unknown>) {
  const res = await fetch("/api/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
  return res.ok;
}

export function PrivacyControls({ initialEnabled, initialPaused }: { initialEnabled: boolean; initialPaused: string[] }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [paused, setPaused] = useState(initialPaused);

  return (
    <div className="mt-4 space-y-4">
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[var(--r-inner)] border border-line-strong px-4 py-3">
        <span>
          <span className="block text-[14px] font-medium">Learn from how I work</span>
          <span className="t-meta">On every site except the ones listed below as never collected</span>
        </span>
        <span className="relative inline-flex shrink-0">
          <input
            type="checkbox"
            role="switch"
            className="peer sr-only"
            checked={enabled}
            onChange={async (e) => {
              const next = e.target.checked;
              setEnabled(next);
              if (!(await save({ tracking_enabled: next }))) setEnabled(!next);
            }}
          />
          <span className="h-6 w-11 rounded-full bg-line-strong transition-colors peer-checked:bg-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent" />
          <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
        </span>
      </label>
      {paused.length > 0 && (
        <div>
          <div className="t-label mb-2">Paused on these sites</div>
          <ul className="flex flex-wrap gap-2">
            {paused.map((h) => (
              <li key={h} className="chip h-7 pr-1.5">
                {h}
                <button
                  aria-label={`Resume on ${h}`}
                  className="grid size-5 place-items-center rounded-full hover:bg-line"
                  onClick={async () => {
                    const next = paused.filter((p) => p !== h);
                    setPaused(next);
                    await save({ paused_hosts: next });
                  }}
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

PrivacyControls.Delete = function DeleteData() {
  const [state, setState] = useState<"idle" | "confirm" | "done">("idle");
  if (state === "done") return <span className="self-center text-[14px] text-good">Everything was deleted.</span>;
  return (
    <>
      <button
        className="btn btn-danger"
        onClick={async () => {
          if (state === "idle") return setState("confirm");
          await fetch("/api/me", { method: "DELETE" });
          setState("done");
        }}
      >
        {state === "confirm" ? "Yes, delete everything" : "Delete my data"}
      </button>
      {state === "confirm" && (
        <button className="btn btn-ghost" onClick={() => setState("idle")}>
          Cancel
        </button>
      )}
    </>
  );
};
