import type { Metadata } from "next";
import FireScreen from "@/components/pantalla-3/FireScreen";

export const metadata: Metadata = {
  title: "Calendario del Fuego · Yakana's Team",
  description: "Calendario de actividad de fuego del Perú con focos de calor MODIS y VIIRS.",
};

export default function Pantalla3() {
  return <FireScreen />;
}
