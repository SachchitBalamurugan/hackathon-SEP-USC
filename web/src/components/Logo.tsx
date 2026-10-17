/** StudyLens mark: a lens over a ruled page. Inherits currentColor. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="9" fill="currentColor" />
      <path d="M8 10.5h10M8 15h7M8 19.5h5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <circle cx="19.5" cy="17.5" r="5.2" stroke="#fff" strokeWidth="2" />
      <path d="M23.4 21.4 26 24" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-ink">
      <LogoMark size={size} />
      <span className="text-[15px] font-semibold tracking-[-0.01em]">StudyLens</span>
    </span>
  );
}
