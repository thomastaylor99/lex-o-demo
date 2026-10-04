import { DM_Sans, DM_Serif_Display } from "next/font/google";

import { ClinicTemplate } from "@/templates/clinic/ClinicTemplate";

const display = DM_Serif_Display({ weight: "400", subsets: ["latin"], variable: "--font-clinic-display" });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-clinic-body" });

export default function ClinicPage() {
  return <ClinicTemplate className={`${display.variable} ${body.variable}`} />;
}
