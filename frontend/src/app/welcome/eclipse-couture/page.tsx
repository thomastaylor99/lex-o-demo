import { Bodoni_Moda, Inter_Tight } from "next/font/google";

import { CoutureWelcome } from "@/welcome/eclipse/variants/CoutureWelcome";
import { Preview } from "@/welcome/Preview";
import { previewQuery } from "@/welcome/query";

const display = Bodoni_Moda({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-eclipse-display" });
const body = Inter_Tight({ subsets: ["latin"], variable: "--font-eclipse-body" });

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { language, state } = previewQuery(await searchParams);
  return <Preview variant={CoutureWelcome} language={language} state={state} className={`${display.variable} ${body.variable}`} />;
}
