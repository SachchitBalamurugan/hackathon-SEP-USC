"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

export function ProfileEditor({ initial }: { initial: string }) {
  const [saved, setSaved] = useState(initial);
  const [text, setText] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");

  async function save() {
    setState("saving");
    const res = await fetch("/api/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mind_doc: text }) });
    if (res.ok) {
      setSaved(text);
      setEditing(false);
      setState("idle");
    } else setState("error");
  }

  if (!editing) {
    return (
      <div>
        {saved ? (
          <div className="space-y-2 text-[14px] leading-[22px] text-ink-2">
            {saved.split(/\n+/).map((p, i) => (
              <p key={i} dangerouslySetInnerHTML={{ __html: escape(p).replace(/\*\*(.+?)\*\*/g, '<strong class="text-ink">$1</strong>') }} />
            ))}
          </div>
        ) : (
          <p className="t-meta">Nothing yet. After a few checks or practice sets, StudyLens writes down how you learn best, where you get stuck, and what to avoid.</p>
        )}
        <button className="btn btn-ghost btn-sm mt-3 -ml-3" onClick={() => setEditing(true)}>
          <Pencil size={14} /> {saved ? "Edit" : "Write it yourself"}
        </button>
      </div>
    );
  }
  return (
    <div>
      <textarea className="input min-h-44 text-[14px]" value={text} onChange={(e) => setText(e.target.value)} aria-label="Learner profile" autoFocus />
      <div className="mt-3 flex items-center gap-2">
        <button className="btn btn-sm" onClick={save} disabled={state === "saving" || text === saved}>
          {state === "saving" ? "Saving" : "Save"}
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setText(saved);
            setEditing(false);
          }}
        >
          Cancel
        </button>
        {state === "error" && <span className="text-[13px] text-danger">Could not save. Try again.</span>}
      </div>
    </div>
  );
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
