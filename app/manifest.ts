import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Shot Track",
    short_name: "Shot Track",
    description: "Registro pessoal de aplicações e planos.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f4f6f8",
    theme_color: "#111827",
    lang: "pt-BR",
    categories: ["health", "utilities"],
    icons: [
      { src: "/icons/shot-track-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/shot-track-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/shot-track-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
