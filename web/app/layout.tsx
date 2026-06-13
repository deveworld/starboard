import type { Metadata } from "next";
import "./globals.css";
import { asset } from "./asset";

export const metadata: Metadata = {
  metadataBase: new URL("https://deveworld.github.io"),
  title: "Starboard — Compact RP2040 Macropad",
  description:
    "Starboard is a compact Hackpad macropad: 6 MX keys + EC11 encoder, a 0.91\" OLED, and 6 SK6812 RGB LEDs, powered by a Seeed XIAO RP2040 and QMK.",
  openGraph: {
    title: "Starboard — Compact RP2040 Macropad",
    description:
      "6 MX keys + EC11 encoder, OLED, RGB. Seeed XIAO RP2040 + QMK. Open-source KiCad PCB and 3D-printed case.",
    images: [asset("/assembled-model-render.png")],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
