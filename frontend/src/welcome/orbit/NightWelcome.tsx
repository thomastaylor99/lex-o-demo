"use client";

import type { WelcomeProps } from "../types";
import { Frame } from "./Frame";
import { Motes } from "./Motes";

/** Orbit, night: black and no products; golden stars orbit a glowing pearl, Begin glows yellow. */
export function NightWelcome(props: WelcomeProps) {
  return (
    <Frame {...props} tone="dark">
      <Motes tone="dark" starting={props.starting} count={28} />
      <Motes tone="dark" starting={props.starting} count={14} rx={30} ry={27} reverse />
    </Frame>
  );
}
