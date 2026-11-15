import type { Metadata } from "next";
import FireScreen from "@/components/pantalla-3/FireScreen";

export const metadata: Metadata = {
  title: "Fire Explorer · Yakana's Team",
  description: "Explore Peru's fire activity by region, year and month with MODIS and VIIRS hotspots.",
};

export default function Pantalla3() {
  return <FireScreen />;
}
