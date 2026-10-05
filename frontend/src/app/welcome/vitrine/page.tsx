import { Manrope, Playfair_Display } from "next/font/google";

import { Preview } from "@/welcome/Preview";
import { previewQuery } from "@/welcome/query";
import { VitrineWelcome } from "@/welcome/vitrine/VitrineWelcome";

const display = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-vitrine-display" });
const body = Manrope({ subsets: ["latin"], variable: "--font-vitrine-body" });

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { language, state } = previewQuery(await searchParams);
  return <Preview variant={VitrineWelcome} language={language} state={state} className={`${display.variable} ${body.variable}`} />;
}
