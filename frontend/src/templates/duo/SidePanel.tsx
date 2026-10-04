import type { Basket as BasketData, BeautyProfile, Language } from "@/lib/events";
import type { ReplyStats } from "@/lib/voice-agent";

import { Basket } from "./Basket";
import { CustomerRecord } from "./CustomerRecord";
import { PanelHeader } from "./PanelHeader";
import { DARK, ON_DARK } from "./styles";

/** L'Oréal's side, dark and full height: speed and cost, the basket, then the customer record. */
export function SidePanel({
  basket,
  profile,
  replyStats,
  costEur,
  language,
}: {
  basket: BasketData;
  profile: BeautyProfile | null;
  replyStats: ReplyStats;
  costEur: number;
  language: Language;
}) {
  return (
    <aside
      className="du-scroll"
      style={{ minWidth: 0, minHeight: 0, overflowY: "auto", background: DARK, color: ON_DARK, display: "flex", flexDirection: "column", gap: 16, padding: "14px 28px 28px" }}
    >
      <PanelHeader replyStats={replyStats} costEur={costEur} language={language} />
      <Basket basket={basket} language={language} />
      <CustomerRecord profile={profile} language={language} />
    </aside>
  );
}
