"use client";

import { useVariantAgent } from "../useVariantAgent";
import { VoiceDockSkin } from "./VoiceDockSkin";

/** The Voice dock template over the scripted conversation, started on mount. */
export function VoiceDockScreen() {
  const agent = useVariantAgent();
  return <VoiceDockSkin agent={agent} />;
}
