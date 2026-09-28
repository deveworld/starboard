import type { Metadata } from "next";
import Configurator from "./Configurator.tsx";

export const metadata: Metadata = {
  title: "Configure — Starboard",
  description: "Remap keys and the knob, set the lighting, write to the OLED and record macros on a Starboard macropad, right in the browser.",
};

export default function ConfigurePage() {
  return <Configurator />;
}
