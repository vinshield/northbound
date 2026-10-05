import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

/**
 * Web app manifest, served at /manifest.webmanifest.
 *
 * This is what makes the site installable, and it is also the file Bubblewrap
 * reads when generating the Android (Trusted Web Activity) build - the name,
 * colours and icons below become the app's name, splash screen and launcher
 * icon, so changing them here changes the app too.
 */
export default function manifest(): MetadataRoute.Manifest {
  const name = publicEnv.storeName;

  return {
    name: `${name} — Menswear built to last`,
    short_name: name,
    description:
      "Considered menswear in natural fibres: oxford shirts, merino knitwear, waxed cotton outerwear and selvedge denim.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f4f1",
    theme_color: "#1a1814",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Shop", url: "/products" },
      { name: "Cart", url: "/cart" },
      { name: "Your orders", url: "/orders" },
    ],
  };
}
