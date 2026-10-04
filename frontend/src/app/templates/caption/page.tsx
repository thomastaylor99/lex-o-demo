import { Archivo, IBM_Plex_Mono } from "next/font/google";

import { CaptionTemplate } from "@/templates/caption/CaptionTemplate";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], style: ["normal", "italic"], variable: "--font-caption-display" });
const mono = IBM_Plex_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-caption-mono" });

export default function CaptionPage() {
  return <CaptionTemplate className={`${display.variable} ${mono.variable}`} />;
}
