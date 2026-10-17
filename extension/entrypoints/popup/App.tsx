import { useEffect, useState } from "react";
import { send } from "@/lib/messages";
import { API_BASE, type Settings } from "@/lib/config";

type Status = { paired: boolean; settings: Settings; syncs: Record<string, number> };

const Lens = () => (
  <span className="mark" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="16" height="16">
      <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M15.5 15.5 L21 21" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  </span>
);

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};

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

  if (!status) return <main className="p muted">Loading</main>;

  if (!status.paired) {
    return (
      <main className="p">
        <div className="brand">
          <Lens /> StudyLens
        </div>
        <p className="muted">
          Open{" "}
          <a href={`${API_BASE}/dashboard/connect#pair`} target="_blank" rel="noreferrer">
            Connect
          </a>{" "}
          on your dashboard, get a pairing code, and type it here.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            pair();
          }}
        >
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCD2345" maxLength={12} autoFocus aria-label="Pairing code" />
          <button disabled={busy || code.length < 6}>{busy ? "Pairing" : "Pair"}</button>
        </form>
        {error && <p className="error">{error}</p>}
        <p className="muted">
          No account yet?{" "}
          <a href={`${API_BASE}/login?mode=signup`} target="_blank" rel="noreferrer">
            Create one free
          </a>
        </p>
      </main>
    );
  }

  const syncs = Object.entries(status.syncs).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <main className="p">
      <div className="brand space">
        <span className="brand">
          <Lens /> StudyLens
        </span>
        <a href={`${API_BASE}/dashboard`} target="_blank" rel="noreferrer">
          Dashboard
        </a>
      </div>
      <p className="muted">
        On any homework page, press <strong>Check my work</strong> in the corner, or <kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>C</kbd>.
      </p>
      <div className="sheet">
        <div className="row">
          <span className="dot on" />
          <span className="grow">Connected to your account</span>
        </div>
        <label className="row">
          <span className={`dot ${status.settings.tracking_enabled ? "on" : ""}`} />
          <span className="grow">
            Learn from how I work
            <span className="muted block">Time on task and rewrites. Never what you type, never on email or banking sites.</span>
          </span>
          <span className="switch">
            <input type="checkbox" role="switch" checked={status.settings.tracking_enabled} onChange={(e) => setTracking(e.target.checked)} aria-label="Learn from how I work" />
            <span />
          </span>
        </label>
        {syncs.length ? (
          syncs.map(([host, t]) => (
            <div key={host} className="row">
              <span className="dot on" />
              <span className="grow">{host}</span>
              <span className="muted">synced {ago(t)}</span>
            </div>
          ))
        ) : (
          <div className="row">
            <span className="dot" />
            <span className="grow muted">Open Canvas or Google Classroom to sync your courses</span>
          </div>
        )}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="space">
        <span className="muted">Signed in on this browser</span>
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
