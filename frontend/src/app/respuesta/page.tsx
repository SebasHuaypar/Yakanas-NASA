import ResponseView from "./ResponseView";

export const metadata = {
  title: "Response · Yakana’s Fire Intelligence",
  description:
    "For firefighters and authorities: active fires with coordinates, filters, CSV and GeoJSON export, and a printable situation report built from NASA satellite data.",
};

export default function Respuesta() {
  return <ResponseView />;
}
