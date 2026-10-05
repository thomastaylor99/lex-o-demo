"use client";

import { useState } from "react";

import { PACKSHOT, QUIET, SURFACE } from "./theme";

/** The packshot from `/products/<id>.png`, filling its relative parent; the brand's initial if the image is missing. */
export function Packshot({
  id,
  brand,
  name,
  padding = 12,
  initialSize = 32,
}: {
  id: string;
  brand: string;
  name?: string;
  padding?: number;
  initialSize?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-hidden
        style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: SURFACE, color: QUIET, fontSize: initialSize, fontWeight: 600 }}
      >
        {brand.charAt(0)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static packshots, no optimisation needed
    <img src={`/products/${id}.png`} alt={name ? `${brand} ${name}` : ""} onError={() => setFailed(true)} style={{ ...PACKSHOT, padding }} />
  );
}
