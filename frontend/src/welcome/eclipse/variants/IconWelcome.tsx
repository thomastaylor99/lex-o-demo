"use client";

import { labels } from "@/components/i18n";

import { HERO } from "../../cover/products";
import type { WelcomeProps } from "../../types";
import { BeginButton } from "../BeginButton";
import { COPY } from "../copy";
import { ECLIPSE_CSS } from "../css";
import { Halo } from "../Halo";
import { Signature } from "../Signature";
import { BACKGROUND, BODY, gold, ROSE, TEXT, TEXT_FAINT, u } from "../theme";
import { Wordmark } from "../Wordmark";
import { Grain } from "./Grain";
import { BACKLIGHT, VARIANTS_CSS } from "./shared";
import { Words } from "./Words";

const HERO_ID = "lop-revitalift-clinical-vitc-serum";
const SERUM = HERO.find((product) => product.id === HERO_ID);

/**
 * Eclipse icon: a fragrance-campaign moment. The serum stands inside the eclipse, back-lit by the
 * gold rim and cut out along its silhouette (Cover's traced outline); the headline sits below.
 */
export function IconWelcome({ language, starting, failure, onBegin }: WelcomeProps) {
  const l = labels(language);
  const copy = COPY[language];
  const label = starting ? l.connecting : failure !== null ? l.tryAgain : l.begin;

  return (
    <div
      data-ec={starting ? "starting" : "idle"}
      style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden", background: BACKGROUND, color: TEXT, fontFamily: BODY }}
    >
      <style>{ECLIPSE_CSS + VARIANTS_CSS}</style>
      <Grain opacity={0.06} />

      <header style={{ position: "relative", paddingTop: u(44) }}>
        <Wordmark advisor={l.advisor} />
      </header>

      <main style={{ position: "relative", flex: 1, minHeight: 0, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: u(500), height: u(500) }}>
          <Halo />
          <span aria-hidden className="ec-breathe" style={{ position: "absolute", inset: "14%", borderRadius: "50%", background: BACKLIGHT }} />
          <div style={{ position: "absolute", left: "50%", top: "50%", height: "86%", aspectRatio: "1", transform: "translate(-50%, -50%)" }}>
            <div className="ec-rise" style={{ width: "100%", height: "100%", filter: `drop-shadow(0 0 ${u(26)} ${gold(0.4)})`, animationDelay: "900ms" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- static packshot, clipped to its silhouette */}
              <img src={`/products/${HERO_ID}.png`} alt="" style={{ display: "block", width: "100%", height: "100%", clipPath: SERUM?.clip }} />
            </div>
          </div>
          <div style={{ position: "absolute", left: "50%", bottom: 0, transform: "translate(-50%, 50%)" }}>
            <div className="ec-rise" style={{ animationDelay: "1600ms" }}>
              <BeginButton label={label} starting={starting} onBegin={onBegin} />
            </div>
          </div>
        </div>
        <div style={{ marginTop: u(64), maxWidth: u(1100) }}>
          <Words lines={copy.headline} sub={copy.sub} size={62} />
        </div>
        {failure !== null && (
          <p role="alert" style={{ margin: `${u(18)} 0 0`, fontSize: u(20), color: ROSE }}>
            {failure}
          </p>
        )}
        <p className="ec-fade" style={{ margin: `${u(22)} 0 0`, fontSize: u(17), color: TEXT_FAINT, animationDelay: "1900ms" }}>
          {l.welcomeNote}
        </p>
      </main>

      <footer style={{ position: "relative", paddingBottom: u(30) }}>
        <Signature builtWith={copy.builtWith} expedition={copy.expedition} />
      </footer>
    </div>
  );
}
