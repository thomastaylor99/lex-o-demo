import { Geist, Instrument_Serif } from "next/font/google";

import { OrbitWelcome } from "@/welcome/orbit/OrbitWelcome";
import { Preview } from "@/welcome/Preview";
import { previewQuery } from "@/welcome/query";

const display = Instrument_Serif({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-orbit-display" });
const body = Geist({ subsets: ["latin"], variable: "--font-orbit-body" });

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { language, state } = previewQuery(await searchParams);
  return <Preview variant={OrbitWelcome} language={language} state={state} className={`${display.variable} ${body.variable}`} />;
}
