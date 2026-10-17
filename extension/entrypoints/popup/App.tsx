import { useEffect, useState } from "react";
import { send } from "@/lib/messages";
import { API_BASE, type Settings } from "@/lib/config";

type Status = { paired: boolean; settings: Settings };

export default function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => send<Status>({ type: "STATUS" }).then(setStatus);
  useEffect(() => {
    refresh();
  }, []);

  async function pair() {
    setBusy(true);
    setError(null);
    try {
      await send({ type: "PAIR", code });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function setTracking(on: boolean) {
    try {
      const s = await send<Settings>({ type: "SETTINGS", patch: { tracking_enabled: on } });
      setStatus((st) => (st ? { ...st, settings: s } : st));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!status) return <main className="p">Loading…</main>;

  if (!status.paired) {
    return (
      <main className="p">
        <h1>StudyLens</h1>
        <p className="muted">
          Get a pairing code on your{" "}
          <a href={`${API_BASE}/dashboard/connect`} target="_blank" rel="noreferrer">
            dashboard
          </a>
          , then enter it here.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            pair();
          }}
        >
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCD2345" maxLength={12} autoFocus aria-label="Pairing code" />
          <button disabled={busy || code.length < 6}>{busy ? "Pairing…" : "Pair"}</button>
        </form>
        {error && <p className="error">{error}</p>}
      </main>
    );
  }

  return (
    <main className="p">
      <h1>StudyLens</h1>
      <p className="muted">Connected. Open any homework page and click the StudyLens button in the corner, or press Alt+Shift+C to check your work.</p>
      <label className="row">
        <input type="checkbox" checked={status.settings.tracking_enabled} onChange={(e) => setTracking(e.target.checked)} />
        <span>
          Learn from how I work
          <span className="muted block">Time on task, idle time, tab switches and rewrites. Never what you type or what's on the page. Never on email, banking or health sites.</span>
        </span>
      </label>
      {error && <p className="error">{error}</p>}
      <div className="row space">
        <a href={`${API_BASE}/dashboard`} target="_blank" rel="noreferrer">
          Dashboard
        </a>
        <button
          className="ghost"
          onClick={async () => {
            await send({ type: "SIGN_OUT" });
            refresh();
          }}
        >
          Disconnect
        </button>
      </div>
    </main>
  );
}
