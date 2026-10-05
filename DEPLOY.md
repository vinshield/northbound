# Going live

Two stages: put the shop on the internet, then wrap it as an Android app.
Do them in that order — the app is a wrapper around the live address, so the
address has to exist first.

---

## Stage 1 — Put the shop online

### 1. Push the code to GitHub

```bash
git add .
git commit -m "Northbound storefront"
```

Create an empty repository on github.com (no README, no .gitignore — this
project already has both), then:

```bash
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

`.env.local` is ignored by git, so your keys stay on your machine.

### 2. Deploy on Vercel

Sign in at vercel.com with GitHub, **Add New → Project**, pick the repo.
Vercel detects Next.js on its own — don't change the build settings.

Before clicking Deploy, open **Environment Variables** and add every line
from your `.env.local` **except** `NEXT_PUBLIC_SITE_URL`:

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | same as local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same as local |
| `SUPABASE_SERVICE_ROLE_KEY` | same as local — secret |
| `PAYSTACK_SECRET_KEY` | keep `sk_test_` until you are ready for real money |
| `MAILGUN_API_KEY` | optional until Mailgun is set up |
| `MAILGUN_DOMAIN` | optional |
| `MAILGUN_FROM` | optional |
| `NEXT_PUBLIC_STORE_NAME` | `Northbound` |
| `NEXT_PUBLIC_CURRENCY` | `NGN` |
| `SHIPPING_FEE_MINOR` | `250000` |
| `FREE_SHIPPING_THRESHOLD_MINOR` | `10000000` |
| `ADMIN_EMAILS` | your email |

Deploy. You will get an address like `https://northbound.vercel.app`.

### 3. Set the site address

Add one more environment variable now that you know the address, then redeploy:

```
NEXT_PUBLIC_SITE_URL=https://northbound.vercel.app
```

This is what builds the Paystack return link and the sign-in redirect. If it is
missing or wrong, customers get bounced to the wrong place after paying.

### 4. Update the three services that still point at localhost

**Supabase** — Authentication → URL Configuration:

- Site URL: `https://northbound.vercel.app`
- Redirect URLs: add `https://northbound.vercel.app/**` (keep the localhost
  entry too, so you can still develop)

**Google** — console.cloud.google.com/auth/clients → your client:

- Authorized JavaScript origins: add `https://northbound.vercel.app`
- Authorized redirect URIs: **no change.** This still points at Supabase, not
  at your site.

**Paystack** — Settings → API Keys & Webhooks:

- Webhook URL: `https://northbound.vercel.app/api/webhooks/paystack`

That last one is new. It could not work on a laptop because Paystack had no way
to reach you. Now it does, and it is the safety net for a customer who pays and
closes the tab before being redirected back.

### 5. Check it

- Open the address, browse, add to cart
- Sign in with Google
- Place a test order with the Paystack test card
- Confirm the order appears in `/admin`

---

## Stage 2 — Build the Android app

The app is a **Trusted Web Activity**: a real Android app that runs your live
site inside actual Chrome, with no browser chrome visible. Google sign-in works
because it genuinely is Chrome — a plain WebView wrapper would be blocked with
a `disallowed_useragent` error.

One codebase. Updating the site updates the app.

### 1. Install the tooling

Needs Node (already installed) and a Java JDK.

```bash
npm install -g @bubblewrap/cli
```

The first run offers to download the Android SDK and a JDK for you. Say yes.

### 2. Generate the project

```bash
bubblewrap init --manifest https://northbound.vercel.app/manifest.webmanifest
```

It reads the manifest this project already serves, so the name, colours and
icons are picked up automatically. Answer the prompts:

- **Application ID** — `com.northbound.twa` (or your own reverse-domain name).
  This is permanent; changing it later means a different app.
- **Signing key** — let it create one. **Back up the keystore file and its
  passwords.** Lose them and you cannot ship an update to the same app, ever.

### 3. Note the fingerprint

```bash
bubblewrap fingerprint list
```

Copy the **SHA-256** value (long, colon-separated hex).

### 4. Link the app to the site

In Vercel, add two more environment variables and redeploy:

```
ANDROID_PACKAGE_NAME=com.northbound.twa
ANDROID_SHA256_FINGERPRINT=<the SHA-256 from above>
```

Check it took effect:

```
https://northbound.vercel.app/.well-known/assetlinks.json
```

It should list your package name instead of `[]`.

This is what tells Android the app and the site have the same owner. Skip it
and the app still runs, but with a Chrome address bar pinned to the top — the
usual sign that this step was missed.

### 5. Build

```bash
bubblewrap build
```

You get `app-release-signed.apk`. Put it on your site, or send it to people
directly.

### 6. Installing it

Android blocks apps from outside the Play Store by default. On first install
the phone prompts to allow it — Settings → *Install unknown apps* → allow for
the browser or file manager being used. Normal for direct distribution, and
the warning goes away if you later publish on Play.

---

## When you are ready for real money

1. Activate the Paystack account (business details, bank account)
2. Swap `PAYSTACK_SECRET_KEY` for the `sk_live_` key in Vercel
3. Point the webhook at the same URL in Paystack's **live** settings — test and
   live modes have separate webhook configuration
4. Place one small real order and refund it, to confirm the whole path works

## Still to do

- **Mailgun** — order confirmation emails. Free Mailgun only sends to addresses
  you have verified; sending to real customers needs your own domain.
- **A custom domain** — replaces `northbound.vercel.app`, makes Google's
  sign-in screen show your name, and is what Mailgun needs.
- **Publishing the app on Google Play** — $25 once, removes the install warning.
