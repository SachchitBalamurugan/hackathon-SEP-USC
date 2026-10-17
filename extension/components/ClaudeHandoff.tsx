import { useState } from "react";
import { CLAUDE_APP_URL } from "@studylens/core";

/** Claude mode: what to say to the student's own Claude, with copy and open buttons. */
export function ClaudeHandoff({ prompt, copied: initiallyCopied = false, waiting }: { prompt: string; copied?: boolean; waiting?: string }) {
  const [copied, setCopied] = useState(initiallyCopied);
  return (
    <div className="sl-card sl-handoff">
      <div className="sl-muted sl-small">{copied ? "Copied. Paste this into Claude:" : "Say this to Claude:"}</div>
      <div className="sl-handoff-prompt">{prompt}</div>
      <div className="sl-row sl-wrap">
        <a className="sl-btn" href={`${CLAUDE_APP_URL}?q=${encodeURIComponent(prompt)}`}>
          Open Claude
        </a>
        <button
          className="sl-btn sl-btn-ghost"
          onClick={() =>
            navigator.clipboard.writeText(prompt).then(
              () => setCopied(true),
              () => setCopied(false),
            )
          }
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {waiting && (
        <p className="sl-muted sl-small" aria-live="polite" style={{ margin: 0 }}>
          <span className="sl-typing" aria-hidden="true" /> {waiting}
        </p>
      )}
    </div>
  );
}
