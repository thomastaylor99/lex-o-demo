"use client";

import type { WelcomeProps } from "../types";
import { Frame } from "./Frame";
import { Motes } from "./Motes";

/** Orbit, pure: white and no products; two slow orbits of light around the pearl and the headline. */
export function PureWelcome(props: WelcomeProps) {
  return (
    <Frame {...props}>
      <Motes tone="light" starting={props.starting} />
      <Motes tone="light" starting={props.starting} count={12} rx={30} ry={27} reverse />
    </Frame>
  );
}
