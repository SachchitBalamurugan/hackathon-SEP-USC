"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CircleAlert, Home, Link2, LogOut, Network, PencilLine, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LogoMark } from "../Logo";

type Item = { href: string; label: string; icon: LucideIcon };
const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "Learn",
    items: [
      { href: "/dashboard", label: "Today", icon: Home },
      { href: "/dashboard/skills", label: "Skills", icon: Network },
      { href: "/dashboard/mistakes", label: "Mistakes", icon: CircleAlert },
      { href: "/dashboard/practice", label: "Practice", icon: PencilLine },
    ],
  },
  { label: "School", items: [{ href: "/dashboard/courses", label: "Courses", icon: BookOpen }] },
  {
    label: "Account",
    items: [
      { href: "/dashboard/connect", label: "Connect", icon: Link2 },
      { href: "/dashboard/privacy", label: "Privacy", icon: Shield },
    ],
  },
];

const isActive = (path: string, href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));

export function Sidebar({ email, signOut }: { email: string; signOut: () => Promise<void> }) {
  const path = usePathname();
  return (
    <>
      {/* Desktop and tablet rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-16 flex-col border-r border-line bg-surface md:flex lg:w-[232px]">
        <Link href="/dashboard" className="flex h-16 items-center gap-2.5 px-4 text-ink" aria-label="StudyLens home">
          <LogoMark size={28} />
          <span className="hidden text-[15px] font-semibold tracking-[-0.01em] lg:inline">StudyLens</span>
        </Link>
        <nav className="flex-1 overflow-y-auto px-2.5 pb-4" aria-label="Main">
          {GROUPS.map((g) => (
            <div key={g.label} className="mt-4 first:mt-1">
              <div className="t-label hidden px-3 pb-1.5 lg:block">{g.label}</div>
              <div className="mx-3 mb-2 border-t border-line lg:hidden" />
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const on = isActive(path, it.href);
                  const Icon = it.icon;
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        title={it.label}
                        aria-current={on ? "page" : undefined}
                        className={`relative flex h-9 items-center gap-3 rounded-[10px] px-3 text-[14px] transition-colors ${on ? "bg-accent-soft font-semibold text-ink" : "text-ink-2 hover:bg-sunken hover:text-ink"}`}
                      >
                        {on && <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-accent" />}
                        <Icon size={17} strokeWidth={1.6} className={on ? "text-accent" : ""} />
                        <span className="hidden lg:inline">{it.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <form action={signOut} className="border-t border-line p-2.5">
          <div className="hidden truncate px-3 pb-1 text-[12px] text-dim lg:block" title={email}>
            {email}
          </div>
          <button className="flex h-9 w-full items-center gap-3 rounded-[10px] px-3 text-[14px] text-ink-2 hover:bg-sunken hover:text-ink" title="Sign out">
            <LogOut size={17} strokeWidth={1.6} />
            <span className="hidden lg:inline">Sign out</span>
          </button>
        </form>
      </aside>

      {/* Phone bottom bar: the five most used destinations */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 backdrop-blur md:hidden" aria-label="Main">
        {[GROUPS[0].items[0], GROUPS[0].items[1], GROUPS[0].items[2], GROUPS[0].items[3], GROUPS[2].items[0]].map((it) => {
          const on = isActive(path, it.href);
          const Icon = it.icon;
          return (
            <Link key={it.href} href={it.href} aria-current={on ? "page" : undefined} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${on ? "font-semibold text-accent" : "text-dim"}`}>
              <Icon size={19} strokeWidth={1.6} />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
