import { NextResponse } from "next/server";

/**
 * Digital Asset Links, served at /.well-known/assetlinks.json via a rewrite
 * in next.config.ts.
 *
 * This is how Android verifies that the APK and this website belong to the
 * same owner. When it matches, the app opens full screen with no browser UI;
 * when it does not, Android falls back to showing a Chrome address bar at the
 * top, which is the usual symptom of this file being wrong or missing.
 *
 * ANDROID_PACKAGE_NAME  e.g. "com.northbound.twa"
 * ANDROID_SHA256_FINGERPRINT  printed by Bubblewrap when it creates the
 *   signing key; colon-separated hex. Several may be given, comma separated,
 *   which is what you need if Google Play re-signs your app.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const packageName = process.env.ANDROID_PACKAGE_NAME;
  const fingerprints = (process.env.ANDROID_SHA256_FINGERPRINT ?? "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  // Before the APK exists there is nothing to assert. An empty array is valid
  // JSON here and simply means "no app is linked yet".
  if (!packageName || fingerprints.length === 0) {
    return NextResponse.json([], {
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
