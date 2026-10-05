import { Cormorant_Garamond, Inter_Tight } from "next/font/google";

import { IconWelcome } from "@/welcome/eclipse/variants/IconWelcome";
import { Preview } from "@/welcome/Preview";
import { previewQuery } from "@/welcome/query";

const display = Cormorant_Garamond({ weight: ["300", "400", "500"], style: ["normal", "italic"], subsets: ["latin"], variable: "--font-eclipse-display" });
const body = Inter_Tight({ subsets: ["latin"], variable: "--font-eclipse-body" });

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { language, state } = previewQuery(await searchParams);
  return <Preview variant={IconWelcome} language={language} state={state} className={`${display.variable} ${body.variable}`} />;
}
