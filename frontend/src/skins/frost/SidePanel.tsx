import type { SkinProps } from "../types";
import { Basket } from "./Basket";
import { CustomerRecord } from "./CustomerRecord";
import { SURFACE } from "./theme";

/** The right quarter, full height: the basket, then the customer record as L'Oréal would store it. */
export function SidePanel({ agent }: SkinProps) {
  return (
    <aside className="fr-scroll" style={{ display: "flex", flexDirection: "column", gap: 18, minHeight: 0, overflowY: "auto", padding: 24, background: SURFACE }}>
      <Basket agent={agent} />
      <CustomerRecord agent={agent} />
    </aside>
  );
}
