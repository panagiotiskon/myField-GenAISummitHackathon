import type { Metadata, Viewport } from "next";
import { Commissioner } from "next/font/google";
import "./globals.css";

// Commissioner: drawn by a Greek type designer, Greek and Latin of equal standing.
// FLAR opens the terminals for the plot code; VOLM is left at rest.
const sans = Commissioner({
  subsets: ["latin", "greek"],
  axes: ["FLAR", "VOLM"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "myField: Plot-cleaning declaration checks",
  description:
    "Hackathon demo: screen Greek plot-cleaning declarations against real imagery. Simulated declarations, demo plot codes, no compliance findings.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "myField: Satellite checks of plot-cleaning declarations",
    description: "Hackathon demo: screen Greek plot-cleaning declarations against real Sentinel-2 and Cadastre imagery.",
    type: "website",
  },
  twitter: { card: "summary" },
};

export const viewport: Viewport = { themeColor: "#0f1612" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the head line below adds m-enter to <html> before React hydrates
    <html lang="en" className={sans.variable} suppressHydrationWarning>
      <head>
        {/* the landing hero's one entrance on load; without script nothing is hidden */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.classList.add('m-enter');setTimeout(()=>document.documentElement.classList.add('m-enter-done'),700)",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
