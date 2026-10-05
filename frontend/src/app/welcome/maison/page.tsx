import { Bodoni_Moda, Inter_Tight } from "next/font/google";

import { MaisonWelcome } from "@/welcome/maison/MaisonWelcome";
import { Preview } from "@/welcome/Preview";
import { previewQuery } from "@/welcome/query";

const display = Bodoni_Moda({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-maison-display" });
const body = Inter_Tight({ subsets: ["latin"], variable: "--font-maison-body" });

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { language, state } = previewQuery(await searchParams);
  return <Preview variant={MaisonWelcome} language={language} state={state} className={`${display.variable} ${body.variable}`} />;
}
