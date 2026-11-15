export const metadata = {
  title: "Story · Yakana's Team",
  description:
    "Peru burns every year: the story of how we merged MODIS and VIIRS into a single fire-hotspot record.",
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
