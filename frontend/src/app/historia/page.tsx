export const metadata = {
  title: "Yakana’s Fire Intelligence",
  description:
    "Peru burns every year: the story of how we merged MODIS and VIIRS into a single fire-hotspot record.",
};

import HeroScroll from "@/components/hero/HeroScroll";
import IntroVideo from "@/components/IntroVideo";
import Regions from "@/components/sections/Regions";
import Satellites from "@/components/sections/Satellites";

export default function Pantalla1() {
  return (
    <>
      <IntroVideo />
      <HeroScroll>
        <Regions />
        <Satellites />
      </HeroScroll>
    </>
  );
}
