import { DM_Sans, DM_Serif_Display } from "next/font/google";

import { LumenTemplate } from "@/templates/lumen/LumenTemplate";

const display = DM_Serif_Display({ weight: "400", subsets: ["latin"], variable: "--font-lumen-display" });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-lumen-body" });

export default function LumenPage() {
  return <LumenTemplate className={`${display.variable} ${body.variable}`} />;
}
