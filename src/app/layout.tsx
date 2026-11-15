import type { Metadata } from "next";
import { Noto_Sans, Noto_Serif } from "next/font/google";
import "./globals.css";

const sans = Noto_Sans({
  subsets: ["latin", "greek"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Noto_Serif({
  subsets: ["latin", "greek"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "myField — γραφείο ακαθάριστων οικοπέδων",
  description:
    "Municipal desk for the Greek uncleared-plot duty. Simulated declarations, public cadastre-style geometry, drafts for signature only.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
