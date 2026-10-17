"use client";

import { useEffect, useState } from "react";

async function post(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
}

export function PairExtension() {
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-4 flex flex-wrap items-center gap-4">
      <button
        className="btn"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await post("/api/pair", { action: "issue" });
          setCode(r.code ?? null);
          setBusy(false);
        }}
      >
        {code ? "New code" : "Get pairing code"}
      </button>
      {code && (
        <code className="rounded-lg bg-accent-soft px-4 py-2 font-mono text-2xl tracking-[0.3em] text-accent" aria-live="polite">
          {code}
        </code>
      )}
    </div>
  );
}

type Key = { id: string; kind: string; label: string | null; created_at: string; last_used_at: string | null };

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <button
          className="text-accent"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="mt-1 overflow-x-auto rounded-lg border border-line bg-bg p-3 font-mono text-xs">{text}</pre>
    </div>
  );
}

export function McpKeys({ mcpUrl }: { mcpUrl: string }) {
  const [keys, setKeys] = useState<Key[]>([]);
  const [fresh, setFresh] = useState<string | null>(null);

  const refresh = () =>
    fetch("/api/keys")
      .then((r) => r.json())
      .then((r) => setKeys(r.keys ?? []));
  useEffect(() => {
    refresh();
  }, []);

  const token = fresh ?? "<your key>";
  return (
    <div className="mt-4">
      <button
        className="btn"
        onClick={async () => {
          const r = await post("/api/keys", { label: "Claude" });
          setFresh(r.key);
          refresh();
        }}
      >
        Create MCP key
      </button>
      {fresh && <p className="mt-3 text-sm text-warn">Copy this key now. It won&apos;t be shown again.</p>}
      {fresh && <CopyBlock label="Key" text={fresh} />}
      <CopyBlock label="Claude Code" text={`claude mcp add --transport http studylens ${mcpUrl} --header "Authorization: Bearer ${token}"`} />
      <CopyBlock
        label="Claude Desktop (claude_desktop_config.json)"
        text={JSON.stringify({ mcpServers: { studylens: { command: "npx", args: ["-y", "mcp-remote", mcpUrl, "--header", `Authorization: Bearer ${token}`] } } }, null, 2)}
      />
      {keys.length > 0 && (
        <ul className="mt-6 divide-y divide-line text-sm">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center justify-between gap-3 py-2">
              <span>
                {k.label ?? k.kind} <span className="text-muted">({k.kind})</span>
                <span className="ml-2 text-muted">{k.last_used_at ? `used ${new Date(k.last_used_at).toLocaleDateString()}` : "never used"}</span>
              </span>
              <button
                className="text-bad"
                onClick={async () => {
                  await post("/api/keys", { id: k.id }, "DELETE");
                  refresh();
                }}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
