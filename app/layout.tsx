import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";

const sans = Manrope({
  subsets: ["latin", "greek"],
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin", "greek"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "PlotCheck · Έλεγχος δηλώσεων καθαρισμού οικοπέδων",
  description:
    "Hackathon demo: screen Greek plot-cleaning declarations against real imagery. Simulated declarations, demo plot codes, no compliance findings.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#f8f8f8" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
