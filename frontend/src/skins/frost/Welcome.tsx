"use client";

import { labels } from "@/components/i18n";
import { EclipseWelcome } from "@/welcome/eclipse/EclipseWelcome";

import type { SkinProps } from "../types";
import { errorText } from "./ErrorBanner";

/**
 * The first screen, and the one Restart returns to: Eclipse, chosen from the mockups under /welcome.
 * Browsers allow the microphone and audio only after a click, so Begin starts the session. A failed
 * start says why in the visitor's language and offers Try again.
 */
export function Welcome({ agent }: SkinProps) {
  const { language, status, error, start } = agent;
  const failure = status === "error" ? errorText(error ?? "", labels(language)) : null;

  return <EclipseWelcome language={language} starting={status === "starting"} failure={failure} onBegin={() => void start()} />;
}
