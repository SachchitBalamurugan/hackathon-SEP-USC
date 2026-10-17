import { requireUser } from "@/lib/session";
import { env } from "@/lib/env";
import { PairExtension, McpKeys } from "./ConnectClient";

export default async function Connect() {
  await requireUser();
  const mcpUrl = `${env.siteUrl()}/api/mcp`;
  return (
    <div className="grid max-w-3xl gap-6">
      <section className="card">
        <h1 className="text-lg font-semibold">Browser extension</h1>
        <p className="mt-1 text-sm text-muted">
          Load the extension (see the README), open its popup, and enter this code. Codes expire after 5 minutes and work once.
        </p>
        <PairExtension />
      </section>
      <section className="card">
        <h2 className="text-lg font-semibold">Claude</h2>
        <p className="mt-1 text-sm text-muted">
          Create a key, then add StudyLens as a remote MCP server. Claude can then see your courses, mastery and mistakes, and save what it learns about you.
        </p>
        <McpKeys mcpUrl={mcpUrl} />
      </section>
    </div>
  );
}
