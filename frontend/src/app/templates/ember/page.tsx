import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { EmberTemplate } from "@/templates/ember/EmberTemplate";

const sans = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-ember" });

export const metadata: Metadata = {
  title: "Ember, L’Oréal beauty advisor",
};

export default function EmberPage() {
  return <EmberTemplate className={sans.variable} />;
}
