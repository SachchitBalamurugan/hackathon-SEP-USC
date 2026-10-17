import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { resolveUser } from "@/lib/auth";
import { buildMcpServer } from "@/lib/mcp";
import { env } from "@/lib/env";

export const maxDuration = 120;

// Stateless Streamable HTTP: every request builds a fresh server bound to the key's user.
// Serverless instances don't share memory, so session state would not survive anyway.

async function handle(req: Request) {
  const caller = await resolveUser(req, ["mcp"]);
  if (!caller) {
    return Response.json(
      { error: "unauthorized", hint: `Create a key at ${env.siteUrl()}/dashboard/connect and send it as a Bearer token.` },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="studylens"' } },
    );
  }
  const server = buildMcpServer(caller.userId);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    // The JSON response is fully built by now; release the per-request server.
    void server.close();
  }
}

export { handle as GET, handle as POST, handle as DELETE };
