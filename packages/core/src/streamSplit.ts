// Split a streaming model reply into prose and complete fenced blocks. Prose is released as it arrives; a ```draw fence is held back until it
// closes, then emitted whole so the client can validate and animate it. A token boundary can
// fall anywhere, including between two backticks, so any suffix that could still grow into an
// opening fence is withheld until it provably cannot.

export const FENCE_NAMES = ["draw"] as const;
export type FenceName = (typeof FENCE_NAMES)[number];

export type SplitEvent = { kind: "text"; text: string } | { kind: "fence"; name: FenceName; body: string };

const OPEN_RE = new RegExp("```(" + FENCE_NAMES.join("|") + ")[ \\t]*\\n");

export class FenceSplitter {
  private buf = "";
  private inFence: FenceName | null = null;

  push(chunk: string): SplitEvent[] {
    this.buf += chunk;
    return this.drain(false);
  }

  /** Flush at end of stream. An unterminated fence is dropped rather than shown as raw JSON. */
  end(): SplitEvent[] {
    const out = this.drain(true);
    this.buf = "";
    this.inFence = null;
    return out;
  }

  private drain(final: boolean): SplitEvent[] {
    const out: SplitEvent[] = [];
    for (;;) {
      if (this.inFence) {
        const close = this.buf.indexOf("```");
        if (close === -1) {
          if (final) this.buf = "";
          return out;
        }
        out.push({ kind: "fence", name: this.inFence, body: this.buf.slice(0, close).trim() });
        this.buf = this.buf.slice(close + 3).replace(/^[ \t]*\n?/, "");
        this.inFence = null;
        continue;
      }
      const m = OPEN_RE.exec(this.buf);
      if (m) {
        if (m.index > 0) out.push({ kind: "text", text: this.buf.slice(0, m.index) });
        this.inFence = m[1] as FenceName;
        this.buf = this.buf.slice(m.index + m[0].length);
        continue;
      }
      // No complete opener. Release everything except a suffix that could still become one.
      const hold = final ? 0 : holdLength(this.buf);
      const release = this.buf.slice(0, this.buf.length - hold);
      if (release) out.push({ kind: "text", text: release });
      this.buf = this.buf.slice(this.buf.length - hold);
      return out;
    }
  }
}

/** Length of the longest suffix of s that is a prefix of some "```name\n" opener. */
function holdLength(s: string): number {
  let hold = 0;
  for (const name of FENCE_NAMES) {
    const opener = "```" + name;
    // A complete name followed only by spaces is still waiting for its newline.
    const pending = new RegExp("```" + name + "[ \\t]*$").exec(s);
    if (pending) hold = Math.max(hold, s.length - pending.index);
    for (let k = Math.min(s.length, opener.length); k > hold; k--) {
      if (opener.startsWith(s.slice(-k))) {
        hold = k;
        break;
      }
    }
  }
  return hold;
}

/** Non-streaming convenience: split a complete reply. */
export function splitReply(text: string): SplitEvent[] {
  const s = new FenceSplitter();
  return mergeText([...s.push(text), ...s.end()]);
}

function mergeText(events: SplitEvent[]): SplitEvent[] {
  const out: SplitEvent[] = [];
  for (const e of events) {
    const last = out[out.length - 1];
    if (e.kind === "text" && last?.kind === "text") last.text += e.text;
    else out.push({ ...e });
  }
  return out;
}
