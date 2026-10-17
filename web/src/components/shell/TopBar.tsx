import type { ReactNode } from "react";
import type { DemoKey } from "@/lib/demos";
import { HowItWorks } from "../DemoVideo";

/** Page header: left-aligned title and one-line description, actions on the right. */
export function TopBar({ title, description, demo, actions }: { title: string; description?: string; demo?: DemoKey; actions?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-6 border-b border-line bg-ground/85 px-4 backdrop-blur-md sm:-mx-8 sm:px-8">
      <div className="flex min-h-16 flex-wrap items-center gap-x-6 gap-y-2 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="t-heading">{title}</h1>
          {description && <p className="t-meta mt-0.5">{description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {demo && <HowItWorks demo={demo} />}
        </div>
      </div>
    </header>
  );
}
