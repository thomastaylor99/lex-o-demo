"use client";

import { labels } from "@/components/i18n";

import type { WelcomeProps } from "../../types";
import { BeginButton } from "../BeginButton";
import { COPY } from "../copy";
import { ECLIPSE_CSS } from "../css";
import { Halo } from "../Halo";
import { Signature } from "../Signature";
import { BACKGROUND, BODY, ROSE, TEXT, TEXT_FAINT, u } from "../theme";
import { Wordmark } from "../Wordmark";
import { Grain } from "./Grain";
import { VARIANTS_CSS } from "./shared";
import { Words } from "./Words";

/** Where the giant eclipse's rim crosses the screen: a golden horizon. */
const HORIZON = "60%";

/**
 * Eclipse horizon: an oversized eclipse, cropped so its rim rises like a golden horizon across the
 * screen. The headline floats in the dark sky above it; Begin sits on the horizon.
 */
export function HorizonWelcome({ language, starting, failure, onBegin }: WelcomeProps) {
  const l = labels(language);
  const copy = COPY[language];
  const label = starting ? l.connecting : failure !== null ? l.tryAgain : l.begin;

  return (
    <div data-ec={starting ? "starting" : "idle"} style={{ position: "absolute", inset: 0, overflow: "hidden", background: BACKGROUND, color: TEXT, fontFamily: BODY }}>
      <style>{ECLIPSE_CSS + VARIANTS_CSS}</style>

      <div className="ec-horizon" style={{ position: "absolute", left: "50%", top: HORIZON, width: u(2200), height: u(2200), transform: "translateX(-50%)" }}>
        <Halo />
      </div>
      <Grain opacity={0.06} />

      <header style={{ position: "absolute", top: u(46), left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Wordmark advisor={l.advisor} />
      </header>

      <section style={{ position: "absolute", left: 0, right: 0, top: "19%", display: "flex", justifyContent: "center", padding: `0 ${u(120)}` }}>
        <Words lines={copy.headline} sub={copy.sub} size={108} />
      </section>

      <div style={{ position: "absolute", left: "50%", top: HORIZON, transform: "translate(-50%, -50%)" }}>
        <div className="ec-rise" style={{ animationDelay: "1800ms" }}>
          <BeginButton label={label} starting={starting} onBegin={onBegin} />
        </div>
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, top: `calc(${HORIZON} + ${u(64)})`, textAlign: "center" }}>
        {failure !== null && (
          <p role="alert" style={{ margin: `0 0 ${u(12)}`, fontSize: u(20), color: ROSE }}>
            {failure}
          </p>
        )}
        <p className="ec-fade" style={{ margin: 0, fontSize: u(18), color: TEXT_FAINT, animationDelay: "2000ms" }}>
          {l.welcomeNote}
        </p>
      </div>

      <footer style={{ position: "absolute", left: 0, right: 0, bottom: u(34), display: "flex", justifyContent: "center" }}>
        <Signature builtWith={copy.builtWith} expedition={copy.expedition} />
      </footer>
    </div>
  );
}
