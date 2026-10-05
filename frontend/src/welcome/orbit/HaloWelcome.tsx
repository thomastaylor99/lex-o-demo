"use client";

import type { WelcomeProps } from "../types";
import { Aura, Spark } from "./Aura";
import { Crown } from "./Crown";
import { Frame } from "./Frame";

/** Orbit, halo: a sunrise of light behind the headline and the products as a crown above it. */
export function HaloWelcome(props: WelcomeProps) {
  return (
    <Frame {...props} voice={<Spark starting={props.starting} />}>
      <Aura starting={props.starting} />
      <Crown starting={props.starting} />
    </Frame>
  );
}
