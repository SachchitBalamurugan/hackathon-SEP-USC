import Link from "next/link";
import { requireUser } from "@/lib/session";
import { signOut } from "../login/actions";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/practice", label: "Practice" },
  { href: "/dashboard/connect", label: "Connect" },
  { href: "/dashboard/privacy", label: "Privacy" },
];

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requireUser();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="font-semibold">
            StudyLens
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm text-muted">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-ink">
                {n.label}
              </Link>
            ))}
          </nav>
          <form action={signOut} className="ml-auto flex items-center gap-3 text-sm text-muted">
            <span className="hidden sm:inline">{user.email}</span>
            <button className="hover:text-ink">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
