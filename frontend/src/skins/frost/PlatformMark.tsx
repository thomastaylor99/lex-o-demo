import type { ReactNode } from "react";

import type { TutorialView } from "@/lib/events";

import { INK } from "./theme";

type Platform = TutorialView["platform"];

const NAMES: Record<Platform, string> = { tiktok: "TikTok", youtube: "YouTube", instagram: "Instagram" };

const STROKE = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Simplified, single-colour versions of each platform's logo, on a 24 px grid. */
const GLYPHS: Record<Platform, ReactNode> = {
  // A note: the stem, its open round head and the flag.
  tiktok: (
    <>
      <path d="M13.5 3v12.3a3.8 3.8 0 1 1-3.8-3.8" {...STROKE} strokeWidth={2.6} />
      <path d="M13.5 3.6c.5 2.8 2.4 4.5 5.2 4.7" {...STROKE} strokeWidth={2.6} />
    </>
  ),
  // The rounded screen with the play triangle cut out.
  youtube: (
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M6.5 5h11A4.5 4.5 0 0 1 22 9.5v5a4.5 4.5 0 0 1-4.5 4.5h-11A4.5 4.5 0 0 1 2 14.5v-5A4.5 4.5 0 0 1 6.5 5zM10 8.8v6.4l5.6-3.2z"
    />
  ),
  // The rounded camera: outline, lens and the small dot.
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" {...STROKE} strokeWidth={2} />
      <circle cx="12" cy="12" r="4" {...STROKE} strokeWidth={2} />
      <circle cx="17" cy="7" r="1.2" fill="currentColor" />
    </>
  ),
};

/** Where the tutorial plays: the platform's mark in white on a black disc, named for screen readers. */
export function PlatformMark({ platform, size }: { platform: Platform; size: number }) {
  return (
    <span
      role="img"
      aria-label={NAMES[platform]}
      title={NAMES[platform]}
      style={{ flex: "none", display: "grid", placeItems: "center", width: size, height: size, borderRadius: 999, background: INK, color: "#fff" }}
    >
      <svg width={Math.round(size * 0.56)} height={Math.round(size * 0.56)} viewBox="0 0 24 24" aria-hidden>
        {GLYPHS[platform]}
      </svg>
    </span>
  );
}
