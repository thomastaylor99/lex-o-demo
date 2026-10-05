/* eslint-disable @next/next/no-img-element -- static packshots, no optimisation needed */

const NICHE = "linear-gradient(180deg, #FFFFFF 0%, #ECEEF1 100%)";
const WIDTH = 172;
const HEIGHT = 240;

/** One product in a lit display niche: a warm spotlight above, a faint mirror reflection below. */
export function Niche({ id, index }: { id: string; index: number }) {
  const image = (
    <img
      src={`/products/${id}.png`}
      alt=""
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: 20, mixBlendMode: "multiply" }}
    />
  );
  return (
    <div className="vi-rise" style={{ animationDelay: `${420 + index * 110}ms`, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: WIDTH, height: HEIGHT }}>
        <span
          aria-hidden
          className="vi-motion"
          style={{
            position: "absolute",
            left: "50%",
            top: -120,
            width: 300,
            height: 300,
            transform: "translateX(-50%)",
            background: "radial-gradient(circle, rgba(255, 233, 196, 0.24) 0%, transparent 62%)",
            animation: `vi-spot 7s ease-in-out ${index * 0.8}s infinite`,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 28,
            background: NICHE,
            overflow: "hidden",
            boxShadow: "0 34px 70px rgba(0, 0, 0, 0.6), 0 0 40px rgba(255, 233, 196, 0.08), inset 0 -12px 26px rgba(0, 0, 0, 0.07)",
          }}
        >
          {image}
        </div>
      </div>
      <div
        aria-hidden
        style={{
          position: "relative",
          width: WIDTH,
          height: 74,
          marginTop: 8,
          overflow: "hidden",
          maskImage: "linear-gradient(to bottom, rgba(0, 0, 0, 0.32), transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0, 0, 0, 0.32), transparent)",
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, width: WIDTH, height: HEIGHT, transform: "scaleY(-1)", borderRadius: 28, background: NICHE, overflow: "hidden" }}>
          {image}
        </div>
      </div>
    </div>
  );
}
