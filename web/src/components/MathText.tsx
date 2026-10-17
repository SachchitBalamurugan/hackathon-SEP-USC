"use client";

import katex from "katex";
import { useMemo } from "react";

/** Render text with $inline$ and $$display$$ LaTeX. Anything KaTeX cannot parse stays as text. */
export function MathText({ text, className }: { text: string; className?: string }) {
  const parts = useMemo(() => {
    const out: { math: boolean; display: boolean; s: string }[] = [];
    const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
    let last = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      if (m.index > last) out.push({ math: false, display: false, s: text.slice(last, m.index) });
      out.push({ math: true, display: Boolean(m[1]), s: m[1] ?? m[2] });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ math: false, display: false, s: text.slice(last) });
    return out;
  }, [text]);

  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.math ? (
          <span key={i} dangerouslySetInnerHTML={{ __html: katex.renderToString(p.s, { displayMode: p.display, throwOnError: false }) }} />
        ) : (
          <span key={i} className="whitespace-pre-wrap">
            {p.s}
          </span>
        ),
      )}
    </span>
  );
}
