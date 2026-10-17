// URL guards. The extension fetches with
// the student's cookies from a privileged worker, so a URL scraped from a page must never steer
// it at an internal address or off the LMS's own domain.

export function isPrivateTarget(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (!/^https?:$/.test(u.protocol)) return true;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h === "0.0.0.0" || h.endsWith(".local") || h.endsWith(".internal")) return true;
    if (h === "[::1]" || h === "::1") return true;
    if (/^127\.|^10\.|^192\.168\.|^169\.254\.|^0\./.test(h)) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
    return false;
  } catch {
    return true;
  }
}

/** Last two labels, or three for common second-level suffixes (school.ac.uk, school.edu.au). */
export function registrableDomain(host: string): string {
  const parts = host.toLowerCase().split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const sld = parts[parts.length - 2];
  const take = /^(ac|edu|co|com|org|gov|net|sch|k12)$/.test(sld) ? 3 : 2;
  return parts.slice(-take).join(".");
}

export function isSameSite(fileUrl: string, tabHost: string): boolean {
  try {
    const h = new URL(fileUrl).hostname.toLowerCase();
    const th = tabHost.toLowerCase();
    if (h === th || h.endsWith("." + th) || th.endsWith("." + h)) return true;
    return registrableDomain(h) === registrableDomain(th);
  } catch {
    return false;
  }
}

/**
 * Sites the behaviour tracker never observes, even with tracking on everywhere. Email, banking,
 * health and password managers carry nothing about learning and a great deal that is private.
 */
const SENSITIVE_HOSTS = [
  /(^|\.)mail\.google\.com$/,
  /(^|\.)outlook\.(live|office)\.com$/,
  /(^|\.)mail\.yahoo\.com$/,
  /(^|\.)(paypal|venmo|chase|bankofamerica|wellsfargo|capitalone|citi|amex|americanexpress|schwab|fidelity|robinhood|coinbase)\.com$/,
  /(^|\.)(mychart|patient|health)\./,
  /(^|\.)(1password|lastpass|bitwarden|dashlane)\.com$/,
  /(^|\.)accounts\.google\.com$/,
  /(^|\.)login\.microsoftonline\.com$/,
];

export function isSensitiveHost(host: string): boolean {
  const h = host.toLowerCase();
  return SENSITIVE_HOSTS.some((re) => re.test(h)) || /bank|credit ?union/.test(h);
}
