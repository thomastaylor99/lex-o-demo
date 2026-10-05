import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

// Geist is the live skin's typeface, read through --font-frost (src/skins/frost/theme.ts).
// The /templates pages load their own fonts.
const geist = Geist({ subsets: ["latin"], variable: "--font-frost" });

export const metadata: Metadata = {
  title: "Beauty voice advisor",
  description: "A voice-driven product discovery demo for beauty and personal care.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
