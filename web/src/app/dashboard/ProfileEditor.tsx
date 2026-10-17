"use client";

import { useState } from "react";

export function ProfileEditor({ initial }: { initial: string }) {
  const [text, setText] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    setState("saving");
    const res = await fetch("/api/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mind_doc: text }) });
    setState(res.ok ? "saved" : "error");
  }

  return (
    <div className="mt-3">
      <textarea
        className="input min-h-40 text-sm leading-relaxed"
        value={text}
        placeholder="No profile yet. It fills in as you use StudyLens."
        onChange={(e) => {
          setText(e.target.value);
          setState("idle");
        }}
        aria-label="Learner profile"
      />
      <div className="mt-2 flex items-center gap-3">
        <button className="btn btn-ghost" onClick={save} disabled={state === "saving" || text === initial}>
          Save
        </button>
        {state === "saved" && <span className="text-sm text-good">Saved</span>}
        {state === "error" && <span className="text-sm text-bad">Could not save</span>}
      </div>
    </div>
  );
}
