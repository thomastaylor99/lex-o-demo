"use client";

import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";

import { labels } from "@/components/i18n";
import type { Language } from "@/lib/events";

import type { WelcomeProps } from "./types";

/**
 * Shows one welcome mockup full screen, in the state a reviewer asks for (`?lang=fr`,
 * `?state=starting`, `?state=error`). Begin opens the scripted conversation after a short
 * connecting moment, as the live screen would.
 */
export function Preview({
  variant: Variant,
  language,
  state,
  className,
}: {
  variant: ComponentType<WelcomeProps>;
  language: Language;
  state: "idle" | "starting" | "error";
  className?: string;
}) {
  const router = useRouter();
  const [starting, setStarting] = useState(state === "starting");
  const failure = state === "error" && !starting ? labels(language).errorMic : null;

  const begin = () => {
    setStarting(true);
    window.setTimeout(() => router.push("/?mock=1&autostart=1"), 900);
  };

  return (
    <div className={className} lang={language} style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      <Variant language={language} starting={starting} failure={failure} onBegin={begin} />
    </div>
  );
}
