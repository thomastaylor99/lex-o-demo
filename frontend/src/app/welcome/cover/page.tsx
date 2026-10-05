import { Bodoni_Moda, DM_Sans } from "next/font/google";
import { CoverWelcome } from "@/welcome/cover/CoverWelcome";
import { Preview } from "@/welcome/Preview";
import { previewQuery } from "@/welcome/query";
const display = Bodoni_Moda({ subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"], variable: "--font-cover-display" });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-cover-body" });
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { language, state } = previewQuery(await searchParams);
  return <Preview variant={CoverWelcome} language={language} state={state} className={`${display.variable} ${body.variable}`} />;
}
