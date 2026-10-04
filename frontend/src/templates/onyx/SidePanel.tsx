import type { Basket as BasketState, BeautyProfile, Language } from "@/lib/events";

import { Basket } from "./Basket";
import { CustomerRecord } from "./CustomerRecord";
import { PANEL } from "./styles";

/** The right quarter: the selection, then the customer record L'Oréal would store. */
export function SidePanel(props: { basket: BasketState; profile: BeautyProfile | null; language: Language }) {
  const { basket, profile, language } = props;
  return (
    <aside
      className="ox-scroll"
      style={{
        background: PANEL,
        borderRadius: 32,
        margin: "0 28px 28px 0",
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 18,
        minHeight: 0,
        overflowY: "auto",
      }}
    >
      <Basket basket={basket} language={language} />
      <CustomerRecord profile={profile} language={language} />
    </aside>
  );
}
