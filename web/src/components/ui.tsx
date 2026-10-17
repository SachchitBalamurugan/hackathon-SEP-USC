import Link from "next/link";
import type { ReactNode } from "react";
import type { DemoKey } from "@/lib/demos";
import { DemoVideo } from "./DemoVideo";

export function Sheet({ title, meta, action, children, className = "" }: { title?: ReactNode; meta?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`sheet ${className}`}>
      {(title || action) && (
        <div className="sheet-head">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
            {meta && <p className="t-meta">{meta}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Row({ mark, title, subtitle, meta, href, children }: { mark?: "good" | "warn" | "danger" | "hollow" | "none"; title: ReactNode; subtitle?: ReactNode; meta?: ReactNode; href?: string; children?: ReactNode }) {
  const body = (
    <>
      {mark !== "none" && <span className={`mark ${mark ? `mark-${mark}` : ""}`} aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium">{title}</div>
        {subtitle && <div className="t-meta truncate">{subtitle}</div>}
      </div>
      {meta && <div className="shrink-0 text-right text-[13px] text-dim tabular-nums">{meta}</div>}
      {children}
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="row hover:bg-sunken/60">
      {body}
    </a>
  ) : (
    <div className="row">{body}</div>
  );
}

/** Empty state that stays inside its sheet, shows how the feature works, and offers the next step. */
export function Empty({ title, detail, action, demo }: { title: string; detail?: string; action?: { label: string; href: string }; demo?: DemoKey }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-10 text-center sm:flex-row sm:text-left">
      {demo && (
        <div className="w-full max-w-[280px] shrink-0">
          <DemoVideo demo={demo} />
        </div>
      )}
      <div className="max-w-[48ch]">
        <div className="text-[15px] font-medium">{title}</div>
        {detail && <p className="t-meta mt-1">{detail}</p>}
        {action && (
          <Link href={action.href} className="btn btn-secondary btn-sm mt-3">
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}

export function dueLabel(at: string | null): { text: string; tone: "danger" | "warn" | "none" } {
  if (!at) return { text: "No due date", tone: "none" };
  const days = Math.floor((Date.parse(at) - Date.now()) / 86_400_000);
  if (days < 0) return { text: "Overdue", tone: "danger" };
  if (days === 0) return { text: "Due today", tone: "danger" };
  if (days === 1) return { text: "Tomorrow", tone: "warn" };
  if (days < 7) return { text: new Date(at).toLocaleDateString(undefined, { weekday: "long" }), tone: "none" };
  return { text: new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" }), tone: "none" };
}

export const statusTone = (status: string) => (status === "verified" ? "good" : status === "shaky" ? "danger" : status === "learning" ? "warn" : "hollow");
export const statusLabel = (status: string) => (status === "verified" ? "Solid" : status === "shaky" ? "Shaky" : status === "learning" ? "Learning" : "New");
