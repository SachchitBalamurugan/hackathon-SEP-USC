import { Caveat } from "next/font/google";
import { ChevronLeft, Download, Eraser, Highlighter, MousePointer2, PenLine, Printer, Search, Type, ZoomIn } from "lucide-react";

const hand = Caveat({ subsets: ["latin"], weight: ["500"] });

export const metadata = { title: "Worksheet 4 - Linear Equations.pdf" };

// A PDF-annotator look (toolbar, page thumbnails, a paper page on grey) with handwritten
// answers and one planted mistake in problem 1.
const PROBLEMS = [
  { q: "Solve for x:   3x + 5 = 20", work: ["3x = 20 + 5", "3x = 25", "x = 25/3"] },
  { q: "Solve for y:   2y − 4 = 10", work: ["2y = 14", "y = 7"] },
  { q: "Solve for n:   5n + 2 = 3n + 10", work: ["2n + 2 = 10", "2n = 8", "n = 4"] },
];

export default function Worksheet() {
  return (
    <div className="flex h-screen flex-col bg-[#e9e9eb] text-[#202124]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-black/10 bg-white px-3 text-[13px]">
        <ChevronLeft size={18} className="text-black/50" />
        <span className="font-semibold">Worksheet 4 - Linear Equations.pdf</span>
        <span className="text-black/40">Algebra 1 · Period 3</span>
        <div className="ml-6 flex items-center gap-1 rounded-md border border-black/10 p-0.5">
          {[MousePointer2, PenLine, Highlighter, Type, Eraser].map((Icon, i) => (
            <span key={i} className={`grid size-8 place-items-center rounded ${i === 1 ? "bg-[#e8f0fe] text-[#1a73e8]" : "text-black/60"}`}>
              <Icon size={16} />
            </span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3 text-black/50">
          <Search size={16} />
          <ZoomIn size={16} />
          <Printer size={16} />
          <Download size={16} />
          <span className="rounded-full bg-[#1a73e8] px-3 py-1 text-[12px] font-semibold text-white">Turn in</span>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[150px] shrink-0 flex-col items-center gap-3 overflow-hidden border-r border-black/10 bg-[#f6f6f7] py-4 md:flex">
          {[1, 2].map((p) => (
            <div key={p} className={`h-[150px] w-[112px] rounded-sm bg-white shadow ${p === 1 ? "outline outline-2 outline-[#1a73e8]" : ""}`} />
          ))}
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto py-8" id="viewer">
          <article className="mx-auto w-[min(820px,calc(100%-32px))] bg-white px-[72px] py-[64px] shadow-[0_1px_3px_rgba(0,0,0,.15),0_8px_24px_rgba(0,0,0,.08)]">
            <div className="flex items-baseline justify-between border-b-2 border-black pb-2">
              <h1 className="text-[22px] font-bold">Worksheet 4: Solving Linear Equations</h1>
              <span className="text-[13px]">Name: <span className={`${hand.className} text-[24px] text-[#1f3f99]`}>Maya R.</span></span>
            </div>
            <p className="mt-3 text-[13px] text-black/70">Show every step. Check your answer by substituting it back into the original equation.</p>
            {PROBLEMS.map((p, i) => (
              <section key={i} className="mt-8">
                <div className="text-[16px]">
                  <strong>{i + 1}.</strong> {p.q}
                </div>
                <div className={`${hand.className} mt-2 space-y-1 pl-10 text-[34px] leading-[46px] text-[#1f3f99]`}>
                  {p.work.map((w) => (
                    <div key={w}>{w}</div>
                  ))}
                </div>
              </section>
            ))}
            <section className="mt-8">
              <div className="text-[16px]">
                <strong>4.</strong> A gym charges $25 to join plus $15 a month. Maya paid $115. How many months?
              </div>
              <div className="mt-3 h-[120px] border-b border-dashed border-black/20" />
            </section>
          </article>
        </main>
      </div>
    </div>
  );
}
