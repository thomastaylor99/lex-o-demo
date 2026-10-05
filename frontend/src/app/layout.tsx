import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, Inter_Tight } from "next/font/google";
import "./globals.css";

// Geist is the live skin's typeface, read through --font-frost (src/skins/frost/theme.ts).
// Cormorant Garamond and Inter Tight are its welcome screen's (src/welcome/eclipse/theme.ts).
// The /templates and /welcome pages load their own fonts.
const geist = Geist({ subsets: ["latin"], variable: "--font-frost" });
const eclipseDisplay = Cormorant_Garamond({
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-eclipse-display",
});
const eclipseBody = Inter_Tight({ subsets: ["latin"], variable: "--font-eclipse-body" });

export const metadata: Metadata = {
  title: "Beauty voice advisor",
  description: "A voice-driven product discovery demo for beauty and personal care.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${eclipseDisplay.variable} ${eclipseBody.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
