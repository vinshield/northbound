import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
        : []),
      { protocol: "https" as const, hostname: "images.unsplash.com" },
      { protocol: "https" as const, hostname: "lh3.googleusercontent.com" },
    ],
  },
  async rewrites() {
    return [
      // Android looks for this exact path. A route segment cannot be named
      // ".well-known", so the handler lives at /assetlinks and is mapped here.
      { source: "/.well-known/assetlinks.json", destination: "/assetlinks" },
    ];
  },
};

export default nextConfig;
