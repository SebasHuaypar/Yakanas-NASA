export const metadata = {
  title: "Historia · Yakana's Team",
  description:
    "El Perú arde cada año: la historia de cómo unimos MODIS y VIIRS en un solo registro de focos de calor.",
};

import HeroScroll from "@/components/hero/HeroScroll";
import Regions from "@/components/sections/Regions";
import Footer from "@/components/sections/Footer";
import Harmonization from "@/components/sections/Harmonization";
import TwoEyes from "@/components/sections/TwoEyes";

export default function Pantalla1() {
  return (
    <HeroScroll>
      <Regions />
      <TwoEyes />
      <Harmonization />
      <Footer />
    </HeroScroll>
  );
}
