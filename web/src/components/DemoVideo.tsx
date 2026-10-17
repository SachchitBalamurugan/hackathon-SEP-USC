"use client";

import { useEffect, useRef, useState } from "react";
import { PlayCircle, X } from "lucide-react";
import { DEMOS, demoSrc, type DemoKey } from "@/lib/demos";

/** Inline, muted, looping demo that plays only while on screen. */
export function DemoVideo({ demo, className = "", controls = false }: { demo: DemoKey; className?: string; controls?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [missing, setMissing] = useState(false);
  const src = demoSrc(demo);

  useEffect(() => {
    const v = ref.current;
    if (!v || controls) return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.35 });
    io.observe(v);
    return () => io.disconnect();
  }, [controls]);

  if (missing) {
    return (
      <div className={`grid aspect-video place-items-center rounded-[var(--r-inner)] border border-line bg-sunken text-center ${className}`}>
        <div className="px-6">
          <div className="t-heading">{DEMOS[demo].title}</div>
          <p className="t-meta mt-1">{DEMOS[demo].caption}</p>
        </div>
      </div>
    );
  }
  return (
    <video
      ref={ref}
      className={`aspect-video w-full rounded-[var(--r-inner)] border border-line bg-sunken object-cover ${className}`}
      poster={src.poster}
      muted
      loop={!controls}
      playsInline
      controls={controls}
      autoPlay={controls}
      preload="metadata"
      aria-label={`${DEMOS[demo].title}: ${DEMOS[demo].caption}`}
      onError={() => setMissing(true)}
    >
      <source src={src.webm} type="video/webm" />
      <source src={src.mp4} type="video/mp4" onError={() => setMissing(true)} />
    </video>
  );
}

/** "How this works" button that opens the page's demo in a dialog. */
export function HowItWorks({ demo }: { demo: DemoKey }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return (
    <>
      <button className="btn btn-secondary btn-sm" onClick={() => setOpen(true)}>
        <PlayCircle size={15} strokeWidth={1.8} />
        How this works
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialog.current && setOpen(false)}
        className="m-auto w-[min(960px,calc(100vw-32px))] rounded-[var(--r-card)] border border-line bg-surface p-0 shadow-[var(--shadow-lift)] backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]"
      >
        {open && (
          <div className="p-4 sm:p-5">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <div className="t-heading">{DEMOS[demo].title}</div>
                <p className="t-meta mt-0.5">{DEMOS[demo].caption}</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <DemoVideo demo={demo} controls />
          </div>
        )}
      </dialog>
    </>
  );
}
