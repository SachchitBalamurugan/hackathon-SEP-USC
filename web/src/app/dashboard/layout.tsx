import { requireUser } from "@/lib/session";
import { Sidebar } from "@/components/shell/Sidebar";
import { signOut } from "../login/actions";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requireUser();
  return (
    <div className="min-h-full bg-ground">
      <Sidebar email={user.email ?? ""} signOut={signOut} />
      <div className="md:pl-16 lg:pl-[232px]">
        <main className="mx-auto w-full max-w-[1120px] px-4 pb-24 sm:px-8 md:pb-12">{children}</main>
      </div>
    </div>
  );
}
