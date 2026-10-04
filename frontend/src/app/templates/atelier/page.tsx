import { Instrument_Sans, Instrument_Serif } from "next/font/google";

import { AtelierTemplate } from "@/templates/atelier/AtelierTemplate";

const serif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-atelier-serif",
});

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-atelier-sans" });

export default function AtelierPage() {
  return <AtelierTemplate className={`${serif.variable} ${sans.variable}`} />;
}
