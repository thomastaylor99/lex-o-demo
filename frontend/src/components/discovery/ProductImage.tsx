"use client";

import { useState } from "react";

/** The packshot from `/products/<id>.png`, or the brand's initial set in the serif if it is missing. */
export function ProductImage({
  id,
  brand,
  name,
  className = "",
}: {
  id: string;
  brand: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`grid place-items-center bg-ivory ${className}`}>
        <span className="font-display text-[44px] italic text-taupe">{brand.charAt(0)}</span>
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden bg-white ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static packshots, no optimisation needed */}
      <img
        src={`/products/${id}.png`}
        alt={`${brand} ${name}`}
        onError={() => setFailed(true)}
        className="absolute inset-0 h-full w-full object-contain p-3 mix-blend-multiply"
      />
    </div>
  );
}
