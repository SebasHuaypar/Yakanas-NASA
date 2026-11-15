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
  async redirects() {
    return [
      { source: "/", destination: "/historia", permanent: false },
      // Nombres de trabajo anteriores: los enlaces viejos siguen funcionando
      { source: "/pantalla-1", destination: "/historia", permanent: true },
      { source: "/pantalla-2", destination: "/metodo", permanent: true },
      { source: "/pantalla-3", destination: "/explorador", permanent: true },
    ];
  },
};

export default nextConfig;
