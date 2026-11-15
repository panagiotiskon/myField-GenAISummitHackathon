import { loadFont } from "@remotion/google-fonts/Commissioner";

const loaded = loadFont("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});

export const fontFamily = loaded.fontFamily;
