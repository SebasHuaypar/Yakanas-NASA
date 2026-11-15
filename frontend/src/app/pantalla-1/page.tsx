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
