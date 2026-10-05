"use client";

import { useVariantAgent } from "../useVariantAgent";
import { InlineVoiceSkin } from "./InlineVoiceSkin";

/** The inline-voice mockup over the scripted conversation, started on mount. */
export function InlineVoiceScreen() {
  const agent = useVariantAgent();
  return <InlineVoiceSkin agent={agent} />;
}
