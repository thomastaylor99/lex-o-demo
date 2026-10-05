"use client";

import { labels } from "@/components/i18n";

import type { WelcomeProps } from "../../types";
import { COPY } from "../copy";
import { ECLIPSE_CSS } from "../css";
import { Halo } from "../Halo";
import { Signature } from "../Signature";
import { BACKGROUND, BODY, CHAMPAGNE, DISPLAY, ROSE, TEXT, TEXT_FAINT, u } from "../theme";
import { HairlineButton } from "./Buttons";
import { Grain } from "./Grain";
import { KICKER, VARIANTS_CSS } from "./shared";
import { Words } from "./Words";

/**
 * Eclipse couture: a fashion campaign. A huge Didone headline on the left, the pure black eclipse
 * on the right with nothing inside it, a fine gold outline to begin, and a film grain over all.
 */
export function CoutureWelcome({ language, starting, failure, onBegin }: WelcomeProps) {
  const l = labels(language);
  const copy = COPY[language];
  const label = starting ? l.connecting : failure !== null ? l.tryAgain : l.begin;

  return (
    <div data-ec={starting ? "starting" : "idle"} style={{ position: "absolute", inset: 0, overflow: "hidden", background: BACKGROUND, color: TEXT, fontFamily: BODY }}>
      <style>{ECLIPSE_CSS + VARIANTS_CSS}</style>

      <div style={{ position: "absolute", right: u(150), top: "50%", width: u(720), height: u(720), transform: "translateY(-50%)" }}>
        <Halo />
      </div>
      <Grain />

      <header className="ec-fade" style={{ position: "absolute", top: u(52), left: u(120), right: u(120), display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: u(18) }}>
          <span style={{ fontFamily: DISPLAY, fontSize: u(50), fontWeight: 500, letterSpacing: "0.01em" }}>L&rsquo;Oréal</span>
          <span style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: u(24), color: CHAMPAGNE }}>{l.advisor}</span>
        </span>
        <span style={{ fontSize: u(16), letterSpacing: "0.04em", color: TEXT_FAINT }}>{KICKER[language]}</span>
      </header>

      <section style={{ position: "absolute", left: u(120), top: "50%", width: u(860), transform: "translateY(-50%)" }}>
        <Words lines={copy.headline} sub={copy.sub} size={128} align="left" weight={400} />
        {failure !== null && (
          <p role="alert" style={{ margin: `${u(28)} 0 0`, fontSize: u(20), color: ROSE }}>
            {failure}
          </p>
        )}
        <div className="ec-rise" style={{ marginTop: u(failure !== null ? 18 : 52), display: "flex", alignItems: "center", gap: u(26), animationDelay: "1700ms" }}>
          <HairlineButton label={label} starting={starting} onBegin={onBegin} />
          <span style={{ fontSize: u(17), color: TEXT_FAINT }}>{l.welcomeNote}</span>
        </div>
      </section>

      <footer style={{ position: "absolute", left: u(120), bottom: u(44) }}>
        <Signature builtWith={copy.builtWith} expedition={copy.expedition} />
      </footer>
    </div>
  );
}
