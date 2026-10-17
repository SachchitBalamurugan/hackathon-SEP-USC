import type { Settings } from "@/lib/config";

export type Context = {
  upcoming: { id: string; title: string; due_at: string | null; missing: boolean; url: string | null; courses: { name: string } | null }[];
  weak: { key: string; label: string; level: number; status: string }[];
  strong: { key: string; label: string }[];
  mistakes: { id: string; skill_label: string; note: string }[];
  settings: Settings;
};

const words = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2));

/** The assignment this page most likely belongs to, by title word overlap. */
export function matchAssignment(ctx: Context | null, title: string) {
  if (!ctx) return null;
  const page = words(title);
  let best: Context["upcoming"][number] | null = null;
  let bestScore = 0;
  for (const a of ctx.upcoming) {
    const w = words(a.title);
    const overlap = [...w].filter((x) => page.has(x)).length / Math.max(1, w.size);
    if (overlap > bestScore) {
      best = a;
      bestScore = overlap;
    }
  }
  return bestScore >= 0.5 ? best : null;
}

function due(at: string | null) {
  if (!at) return "";
  const d = Math.round((Date.parse(at) - Date.now()) / 86_400_000);
  return d < 0 ? "overdue" : d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${d}d`;
}

export function TodayPanel({ ctx, host, onPractice, onSetting }: { ctx: Context | null; host: string; onPractice: (skill: string) => void; onSetting: (patch: Partial<Settings>) => void }) {
  if (!ctx) return <p className="sl-muted">Loading…</p>;
  const current = matchAssignment(ctx, document.title);
  const s = ctx.settings;
  const paused = s.paused_hosts.includes(host);
  const autoCheck = s.auto_check_hosts.includes(host);
  return (
    <div className="sl-today">
      {current && (
        <div className="sl-card sl-current">
          <div className="sl-small sl-muted">You're working on</div>
          <div className="sl-strong">{current.title}</div>
          <div className="sl-small sl-muted">
            {current.courses?.name} · due {due(current.due_at)}
          </div>
        </div>
      )}
      <section>
        <h3 className="sl-h">Due soon</h3>
        {ctx.upcoming.length ? (
          <ul className="sl-list">
            {ctx.upcoming.slice(0, 6).map((a) => (
              <li key={a.id}>
                <span className="sl-truncate">{a.url ? <a href={a.url} target="_blank" rel="noreferrer">{a.title}</a> : a.title}</span>
                <span className={a.missing ? "sl-bad" : "sl-muted"}>{a.missing ? "missing" : due(a.due_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sl-muted sl-small">Nothing due. Open Canvas or Classroom to sync.</p>
        )}
      </section>
      {ctx.weak.length > 0 && (
        <section>
          <h3 className="sl-h">Work on</h3>
          <div className="sl-chips">
            {ctx.weak.map((m) => (
              <button key={m.key} className="sl-chip" onClick={() => onPractice(m.label)} title="Practice this">
                {m.label} <span className="sl-muted">{Math.round(m.level * 100)}%</span>
              </button>
            ))}
          </div>
        </section>
      )}
      <section>
        <h3 className="sl-h">On this site</h3>
        <label className="sl-check">
          <input type="checkbox" checked={autoCheck} onChange={(e) => onSetting({ auto_check_hosts: e.target.checked ? [...s.auto_check_hosts, host] : s.auto_check_hosts.filter((h) => h !== host) })} />
          Check my work automatically when I pause writing
        </label>
        <label className="sl-check">
          <input type="checkbox" checked={s.tracking_enabled && !paused} disabled={!s.tracking_enabled} onChange={(e) => onSetting({ paused_hosts: e.target.checked ? s.paused_hosts.filter((h) => h !== host) : [...s.paused_hosts, host] })} />
          Learn from how I work here {!s.tracking_enabled && <span className="sl-muted">(off everywhere; turn on in the popup)</span>}
        </label>
      </section>
    </div>
  );
}
