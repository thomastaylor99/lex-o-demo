import { FONT, WHITE, WHITE_64, YELLOW, YELLOW_GLOW } from "./styles";

/** V2 camera slot: a framed placeholder with a face oval and a scanning shimmer. No camera access. */
export function CameraPanel() {
  return (
    <section
      className="ox-in"
      aria-label="Camera preview"
      style={{
        position: "relative",
        height: "100%",
        minHeight: 0,
        borderRadius: 32,
        overflow: "hidden",
        background: "radial-gradient(120% 90% at 50% 35%, #232327 0%, #121214 55%, #050505 100%)",
        boxShadow: "0 30px 80px rgba(0, 0, 0, 0.6)",
        fontFamily: FONT,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          top: "44%",
          width: "58%",
          aspectRatio: "3 / 4",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          border: `2px solid ${YELLOW_GLOW}`,
          boxShadow: `0 0 60px rgba(255, 200, 61, 0.16), inset 0 0 60px rgba(255, 200, 61, 0.08)`,
        }}
      />
      <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: "100%",
            background: "linear-gradient(to bottom, transparent 0%, rgba(255, 200, 61, 0) 62%, rgba(255, 200, 61, 0.14) 74%, transparent 76%)",
            animation: "ox-scan 3.6s ease-in-out infinite",
          }}
        />
      </div>
      <span
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderRadius: 999,
          padding: "6px 14px",
          background: "rgba(0, 0, 0, 0.55)",
          color: WHITE_64,
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 999, background: YELLOW, animation: "ox-dot 1.6s ease-in-out infinite" }} />
        Coming in V2
      </span>
      <p
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          bottom: 20,
          borderRadius: 22,
          padding: "14px 18px",
          background: "rgba(0, 0, 0, 0.6)",
          color: WHITE,
          fontSize: 19,
          fontWeight: 600,
          lineHeight: 1.35,
          textAlign: "center",
        }}
      >
        Camera: the expert will look at your skin
      </p>
    </section>
  );
}
