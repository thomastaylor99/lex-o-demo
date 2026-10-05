"use client";

import { useVariantAgent } from "../useVariantAgent";
import { BreathingIslandSkin } from "./BreathingIslandSkin";

/** The breathing island template over the scripted conversation. */
export function BreathingIslandScreen() {
  const agent = useVariantAgent();
  return <BreathingIslandSkin agent={agent} />;
}
