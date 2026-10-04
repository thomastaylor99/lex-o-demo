import { Figtree } from "next/font/google";

import { OnyxTemplate } from "@/templates/onyx/OnyxTemplate";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-onyx" });

export default function OnyxPage() {
  return <OnyxTemplate className={figtree.variable} />;
}
