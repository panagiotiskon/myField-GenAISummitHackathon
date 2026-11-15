import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin", "greek"],
  variable: "--font-sans",
});

const serif = Source_Serif_4({
  subsets: ["latin", "greek"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "myField · Γραφείο ακαθάριστων οικοπέδων",
  description:
    "Hackathon desk for the Greek uncleared-plot duty. Simulated declarations, demo parcel ids, drafts for signature only.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <body className={`${sans.variable} ${serif.variable}`}>{children}</body>
    </html>
  );
}
