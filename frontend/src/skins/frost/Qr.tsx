"use client";

import { useMemo } from "react";
import { encode } from "uqr";

import { INK } from "./theme";

/** Light modules around the code. The standard asks for four; two are enough on a white tile. */
const QUIET_ZONE = 2;

/** The dark modules as one SVG path, one rectangle per horizontal run. */
function darkModules(rows: boolean[][]): string {
  let path = "";
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      const start = x;
      while (x < row.length && row[x]) x += 1;
      path += `M${start} ${y}h${x - start}v1h${start - x}z`;
    }
  });
  return path;
}

/**
 * A QR code of `value`: ink modules on white, centred in a white `size` px square. Each module
 * takes a whole number of pixels, so the edges stay sharp for phone cameras.
 */
export function Qr({ value, size, label }: { value: string; size: number; label: string }) {
  const code = useMemo(() => {
    const qr = encode(value, { ecc: "M", border: 0 });
    return { path: darkModules(qr.data), modules: qr.size + 2 * QUIET_ZONE };
  }, [value]);
  const pixels = Math.max(1, Math.floor(size / code.modules)) * code.modules;

  return (
    <span style={{ flex: "none", display: "grid", placeItems: "center", width: size, height: size, background: "#fff" }}>
      <svg
        role="img"
        aria-label={label}
        width={pixels}
        height={pixels}
        viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${code.modules} ${code.modules}`}
        shapeRendering="crispEdges"
      >
        <path d={code.path} fill={INK} />
      </svg>
    </span>
  );
}
