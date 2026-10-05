"use client";

import { labels } from "@/components/i18n";

import { LorealLogo } from "../LorealLogo";
import type { WelcomeProps } from "../types";
import { BeginButton } from "./BeginButton";
import { COPY } from "./copy";
import { ECLIPSE_CSS } from "./css";
import { Halo } from "./Halo";
import { Headline } from "./Headline";
import { Motes } from "./Motes";
import { Signature } from "./Signature";
import { BACKGROUND, BODY, RING, ROSE, TEXT, TEXT_FAINT, u } from "./theme";

/**
 * Eclipse: cinematic night, the L'Oréal logo top left. A golden halo breathes in the dark like a voice,
 * the headline surfaces word by word inside it, and Begin sits inside the disc below it. While
 * connecting the halo shimmers faster; a failed start says why just above the button.
 * The live screen's welcome (src/skins/frost/Welcome.tsx). Its caller handles Begin: the skin
 * starts the session, the mockup gallery's Preview opens the scripted one.
 */
export function EclipseWelcome({ language, starting, failure, onBegin }: WelcomeProps) {
  const l = labels(language);
  const copy = COPY[language];
  const label = starting ? l.connecting : failure !== null ? l.tryAgain : l.begin;

  return (
    <div
      data-ec={starting ? "starting" : "idle"}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "hidden",
        background: BACKGROUND,
        color: TEXT,
        fontFamily: BODY,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style>{ECLIPSE_CSS}</style>
      <Motes />

      <header className="ec-fade" style={{ position: "relative", alignSelf: "stretch", padding: `${u(48)} ${u(64)} 0`, animationDelay: "200ms" }}>
        <LorealLogo height={u(34)} />
      </header>

      <main
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ position: "relative", flex: "none", width: u(RING), height: u(RING) }}>
          <Halo />

          {/* Everything sits inside the disc, Begin included, well clear of the ring. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: `0 ${u(80)}`,
            }}
          >
            <Headline lines={copy.headline} sub={copy.sub} />
            {failure !== null && (
              <p role="alert" className="ec-rise" style={{ margin: `${u(18)} 0 0`, textAlign: "center", fontSize: u(20), lineHeight: 1.35, color: ROSE }}>
                {failure}
              </p>
            )}
            <div className="ec-rise" style={{ marginTop: u(failure !== null ? 16 : 34), animationDelay: "1600ms" }}>
              <BeginButton label={label} starting={starting} onBegin={onBegin} />
            </div>
          </div>
        </div>

        <p
          className="ec-fade"
          style={{ margin: `${u(34)} 0 0`, fontSize: u(19), color: TEXT_FAINT, textAlign: "center", animationDelay: "1900ms" }}
        >
          {l.welcomeNote}
        </p>
      </main>

      <footer style={{ position: "relative", paddingBottom: u(34) }}>
        <Signature builtWith={copy.builtWith} expedition={copy.expedition} />
      </footer>
    </div>
  );
}
