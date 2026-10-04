import type { Metadata } from "next";
import { JetBrains_Mono, Sora } from "next/font/google";

import { StudioTemplate } from "@/templates/studio/StudioTemplate";

const display = Sora({ subsets: ["latin"], variable: "--font-studio-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-studio-mono" });

export const metadata: Metadata = {
  title: "Studio, L’Oréal beauty advisor",
};

export default function StudioPage() {
  return <StudioTemplate className={`${display.variable} ${mono.variable}`} />;
}
