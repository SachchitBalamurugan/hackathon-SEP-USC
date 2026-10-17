"use client";

import { useState } from "react";

async function save(patch: Record<string, unknown>) {
  const res = await fetch("/api/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
  return res.ok;
}

export function PrivacyControls({ initialEnabled, initialPaused }: { initialEnabled: boolean; initialPaused: string[] }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [paused, setPaused] = useState(initialPaused);

  return (
    <div className="mt-4 space-y-4">
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--accent)]"
          checked={enabled}
          onChange={async (e) => {
            const next = e.target.checked;
            setEnabled(next);
            if (!(await save({ tracking_enabled: next }))) setEnabled(!next);
          }}
        />
        Learn from how I work, on every site except the excluded ones
      </label>
      {paused.length > 0 && (
        <div>
          <p className="text-sm text-muted">Paused on these sites:</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {paused.map((h) => (
              <li key={h} className="flex items-center gap-2 rounded-full border border-line px-3 py-1 text-sm">
                {h}
                <button
                  aria-label={`Resume on ${h}`}
                  className="text-muted hover:text-ink"
                  onClick={async () => {
                    const next = paused.filter((p) => p !== h);
                    setPaused(next);
                    await save({ paused_hosts: next });
                  }}
                >
                  ×
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
  if (state === "done") return <span className="self-center text-sm text-good">Deleted.</span>;
  return (
    <button
      className="btn btn-ghost text-bad"
      onClick={async () => {
        if (state === "idle") return setState("confirm");
        await fetch("/api/me", { method: "DELETE" });
        setState("done");
      }}
    >
      {state === "confirm" ? "Click again to delete everything" : "Delete my data"}
    </button>
  );
};
