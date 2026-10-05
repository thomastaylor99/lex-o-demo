"use client";

import type { SkinProps } from "../types";
import { ConversationColumn } from "./ConversationColumn";
import { FROST_CSS } from "./css";
import { ErrorBanner } from "./ErrorBanner";
import { Header } from "./Header";
import { SidePanel } from "./SidePanel";
import { FONT, INK } from "./theme";
import { Welcome } from "./Welcome";

/**
 * The first skin: Frost's white screen, black pills and yellow voice, with Lumen's agent labels and
 * relay. The welcome screen shows until the session is live, and again after Restart; a start that
 * failed before anything was said stays there with Try again.
 */
export function FrostSkin({ agent }: SkinProps) {
  const { status } = agent;
  const welcome = status === "idle" || status === "starting" || (status === "error" && agent.transcript.length === 0);

  return (
    <div
      lang={agent.language}
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        gridTemplateColumns: welcome ? "minmax(0, 1fr)" : "minmax(0, 3fr) minmax(0, 1fr)",
        gridTemplateRows: "minmax(0, 1fr)",
        overflow: "hidden",
        background: "#fff",
        color: INK,
        fontFamily: FONT,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style>{FROST_CSS}</style>
      {welcome ? (
        <Welcome agent={agent} />
      ) : (
        <>
          <main style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, padding: "0 56px 28px" }}>
            <Header agent={agent} />
            <ErrorBanner agent={agent} />
            <ConversationColumn agent={agent} />
          </main>
          <SidePanel agent={agent} />
        </>
      )}
    </div>
  );
}
