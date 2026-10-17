"use client";

import dynamic from "next/dynamic";

// three.js only loads in the browser, after the page's text has painted.
export const Hero3D = dynamic(() => import("@/components/three/HeroScene"), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-[var(--r-card)] bg-sunken/60" />,
});
