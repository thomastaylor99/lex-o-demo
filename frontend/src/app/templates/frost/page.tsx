import { Geist } from "next/font/google";

import { FrostTemplate } from "@/templates/frost/FrostTemplate";

const geist = Geist({ subsets: ["latin"], variable: "--font-frost" });

export default function FrostPage() {
  return <FrostTemplate className={geist.variable} />;
}
