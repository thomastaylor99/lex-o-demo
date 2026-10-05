"use client";

import type { WelcomeProps } from "../types";
import { Frame } from "./Frame";
import { RingProducts } from "./RingProducts";

/** Orbit, ring: the products travel along a fine visible orbit; they speed up while connecting. */
export function RingWelcome(props: WelcomeProps) {
  return (
    <Frame {...props}>
      <RingProducts starting={props.starting} />
    </Frame>
  );
}
