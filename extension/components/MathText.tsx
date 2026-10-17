import katex from "katex";
import { useMemo } from "react";

// KaTeX's HTML output needs its web fonts, and @font-face is ignored inside a shadow root, so
// the overlay renders native MathML instead (Chrome 109+), which needs no fonts at all.
const render = (tex: string, displayMode: boolean) => katex.renderToString(tex, { displayMode, output: "mathml", throwOnError: false });

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
      {parts.map((p, i) => (p.math ? <span key={i} dangerouslySetInnerHTML={{ __html: render(p.s, p.display) }} /> : <span key={i} className="sl-pre">{p.s}</span>))}
    </span>
  );
}

export function Latex({ tex, display = true }: { tex: string; display?: boolean }) {
  return <span dangerouslySetInnerHTML={{ __html: render(tex, display) }} />;
}
