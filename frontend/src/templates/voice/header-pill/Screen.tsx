"use client";

import { useVariantAgent } from "../useVariantAgent";
import { HeaderPillSkin } from "./HeaderPillSkin";

/** The header pill template over the scripted conversation. */
export function HeaderPillScreen() {
  const agent = useVariantAgent();
  return <HeaderPillSkin agent={agent} />;
}
