"use client";

import { FROST_CSS } from "@/skins/frost/css";
import { ErrorBanner } from "@/skins/frost/ErrorBanner";
import { SidePanel } from "@/skins/frost/SidePanel";
import { FONT, INK } from "@/skins/frost/theme";
import { Welcome } from "@/skins/frost/Welcome";
import type { SkinProps } from "@/skins/types";

import { QuietHeader } from "../QuietHeader";
import { BI_CSS } from "./css";
import { IslandColumn } from "./IslandColumn";

/** Breathing island: a small frosted island over the conversation that widens as the agent speaks. */
export function BreathingIslandSkin({ agent }: SkinProps) {
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
      <style>{FROST_CSS + BI_CSS}</style>
      {welcome ? (
        <Welcome agent={agent} />
      ) : (
        <>
          <main style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, padding: "0 56px 28px" }}>
            <QuietHeader agent={agent} />
            <ErrorBanner agent={agent} />
            <IslandColumn agent={agent} />
          </main>
          <SidePanel agent={agent} />
        </>
      )}
    </div>
  );
}
