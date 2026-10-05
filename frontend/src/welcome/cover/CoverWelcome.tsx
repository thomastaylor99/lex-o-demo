"use client";

import { labels } from "@/components/i18n";

import type { WelcomeProps } from "../types";
import { BeginLine } from "./BeginLine";
import { coverCopy } from "./copy";
import { CoverLines } from "./CoverLines";
import { COVER_CSS } from "./css";
import { Masthead } from "./Masthead";
import { StillLife } from "./StillLife";
import { BODY, FIELD, QUIET, TEXT, u } from "./theme";

/**
 * Cover: the welcome screen as a landscape fashion magazine cover. The L’Oréal masthead runs
 * across the top, three real products stand cut out on a gold disc, the cover lines speak in the
 * magazine's voice, and Begin is the main cover line. Built on a 1920 by 1080 artboard that
 * scales to fit, so it holds at 1440 by 900.
 */
export function CoverWelcome({ language, starting, failure, onBegin }: WelcomeProps) {
  const l = labels(language);
  const copy = coverCopy(language);
  const label = starting ? l.connecting : failure !== null ? l.tryAgain : l.begin;

  return (
    <div className="co-root" style={{ position: "absolute", inset: 0, overflow: "hidden", background: FIELD, color: TEXT }}>
      <style>{COVER_CSS}</style>

      <main
        className="co-stage"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: u(1920),
          height: u(1080),
          translate: "-50% -50%",
        }}
      >
        <Masthead dateLine={copy.dateLine} advisor={l.advisor} />
        <StillLife starting={starting} />
        {/* One column under the masthead: the story on top, Begin at the foot, never overlapping. */}
        <section
          style={{
            position: "absolute",
            left: u(88),
            top: u(400),
            bottom: u(112),
            width: u(960),
            display: "flex",
            flexDirection: "column",
          }}
        >
          <CoverLines copy={copy} />
          <BeginLine label={label} note={l.welcomeNote} starting={starting} failure={failure} onBegin={onBegin} />
        </section>

        <footer
          className="co-rise"
          style={{
            position: "absolute",
            left: u(88),
            bottom: u(40),
            fontFamily: BODY,
            fontSize: u(18),
            letterSpacing: "0.01em",
            color: QUIET,
            animationDelay: "680ms",
          }}
        >
          {copy.signature}
        </footer>
      </main>
    </div>
  );
}
