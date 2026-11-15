import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      // Relieve pre-generado de cada región (tools/make_region_assets.py). La versión va en la ruta:
      // si se regenera, se publica en una versión nueva (/v3/…) y los navegadores no reutilizan la copia vieja.
      {
        source: "/explorador/regions/:version/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/", destination: "/historia", permanent: false },
      // Nombres de trabajo anteriores: los enlaces viejos siguen funcionando
      { source: "/pantalla-1", destination: "/historia", permanent: true },
      { source: "/pantalla-2", destination: "/metodo", permanent: true },
      { source: "/pantalla-3", destination: "/explorador", permanent: true },
      // La página de alertas pasó a ser la de prevención
      { source: "/alertas", destination: "/prevencion", permanent: true },
    ];
  },
};

export default nextConfig;
