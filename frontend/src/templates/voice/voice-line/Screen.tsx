"use client";

import { useVariantAgent } from "../useVariantAgent";
import { VoiceLineSkin } from "./VoiceLineSkin";

/** The Voice line mockup over the scripted conversation, started on mount. */
export function VoiceLineScreen() {
  const agent = useVariantAgent();
  return <VoiceLineSkin agent={agent} />;
}
