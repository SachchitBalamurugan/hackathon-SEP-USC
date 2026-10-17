import { requireUser } from "@/lib/session";
import { env } from "@/lib/env";
import { getOnboarding } from "@/lib/overview";
import { TopBar } from "@/components/shell/TopBar";
import { ConnectSteps } from "./ConnectClient";

export const metadata = { title: "Connect" };

export default async function Connect() {
  const user = await requireUser();
  const status = await getOnboarding(user.id);
  return (
    <>
      <TopBar title="Connect" description="Add the browser extension and connect Claude. Each step ticks off as soon as it works." demo="setup" />
      <ConnectSteps initial={status} mcpUrl={`${env.siteUrl()}/api/mcp`} />
    </>
  );
}
