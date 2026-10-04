import { Hanken_Grotesk, Italiana } from "next/font/google";

import { NoirTemplate } from "@/templates/noir/NoirTemplate";

const display = Italiana({ weight: "400", subsets: ["latin"], variable: "--font-noir-display" });
const body = Hanken_Grotesk({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-noir-body" });

export default function NoirPage() {
  return <NoirTemplate className={`${display.variable} ${body.variable}`} />;
}
