import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "그 사랑교회 Meals",
    short_name: "Meals",
    description: "그 사랑교회 식사 신청",
    start_url: "/",
    display: "standalone",
    background_color: "#faf5ec",
    theme_color: "#faf5ec",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
