import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import { DuoTemplate } from "@/templates/duo/DuoTemplate";

const duo = Manrope({ subsets: ["latin"], variable: "--font-duo" });

export const metadata: Metadata = {
  title: "Duo, L’Oréal beauty advisor",
};

export default function DuoPage() {
  return <DuoTemplate className={duo.variable} />;
}
