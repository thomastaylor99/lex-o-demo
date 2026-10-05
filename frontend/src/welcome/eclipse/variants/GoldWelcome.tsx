"use client";

import { labels } from "@/components/i18n";

import { LorealLogo } from "../../LorealLogo";
import type { WelcomeProps } from "../../types";
import { COPY } from "../copy";
import { ECLIPSE_CSS } from "../css";
import { Signature } from "../Signature";
import { BACKGROUND, BODY, ROSE, TEXT, TEXT_FAINT, u } from "../theme";
import { GlassButton } from "./Buttons";
import { Grain } from "./Grain";
import { LiquidRing } from "./LiquidRing";
import { VARIANTS_CSS } from "./shared";
import { Words } from "./Words";

/**
 * Eclipse in liquid gold: the L'Oréal logo top left, and a molten metallic ring holding the headline
 * and a frosted glass Begin inside it.
 */
export function GoldWelcome({ language, starting, failure, onBegin }: WelcomeProps) {
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

      <header className="ec-fade" style={{ position: "relative", alignSelf: "stretch", padding: `${u(48)} ${u(64)} 0`, animationDelay: "200ms" }}>
        <LorealLogo height={u(34)} />
      </header>

      <main style={{ position: "relative", flex: 1, minHeight: 0, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: u(700), height: u(700) }}>
          <LiquidRing />
          {/* Everything sits inside the disc, Begin included, well clear of the gold. */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: `0 ${u(90)}` }}>
            <Words lines={copy.headline} sub={copy.sub} size={80} />
            {failure !== null && (
              <p role="alert" style={{ margin: `${u(18)} 0 0`, textAlign: "center", fontSize: u(20), color: ROSE }}>
                {failure}
              </p>
            )}
            <div className="ec-rise" style={{ marginTop: u(failure !== null ? 16 : 36), animationDelay: "1600ms" }}>
              <GlassButton label={label} starting={starting} onBegin={onBegin} />
            </div>
          </div>
        </div>
        <p className="ec-fade" style={{ margin: `${u(34)} 0 0`, fontSize: u(18), color: TEXT_FAINT, animationDelay: "1900ms" }}>
          {l.welcomeNote}
        </p>
      </main>

      <footer style={{ position: "relative", paddingBottom: u(34) }}>
        <Signature builtWith={copy.builtWith} expedition={copy.expedition} />
      </footer>
    </div>
  );
}
