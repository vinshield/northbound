# Northbound

An online menswear store built with Next.js 15, Supabase, Paystack and Mailgun.

- **Storefront** — catalog with categories, size/colour variants, live stock, cart, guest checkout
- **Payments** — Paystack (test mode out of the box), verified server-side and by signed webhook
- **Email** — order confirmations through the Mailgun HTTP API
- **Auth** — Google sign-in via Supabase Auth, using an OAuth client from Google Cloud Console
- **Admin** — product and inventory management, image uploads, order fulfilment

---

## Setup

```bash
npm install
cp .env.local.example .env.local   # then fill it in, see below
npm run dev
```

The app boots without configuration and shows a setup checklist until Supabase is connected.

> Putting it on the internet and building the Android app: see [DEPLOY.md](DEPLOY.md).

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **Settings → API Keys** gives you three values for `.env.local`:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL` (just the origin — no `/rest/v1` suffix)
   - publishable key (`sb_publishable_…`, older projects call it `anon`) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - secret key (`sb_secret_…`, older projects call it `service_role`) → `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

   Supabase is retiring the `anon`/`service_role` naming by the end of 2026. Both
   key styles work here; paste whichever the dashboard shows.
3. Open **SQL Editor** and run, in order:
   - [`supabase/schema.sql`](supabase/schema.sql) — tables, RLS, the settlement function, storage bucket
   - [`supabase/seed.sql`](supabase/seed.sql) — nine demo products with variants and stock

Both files are safe to re-run.

### 2. Google sign-in

In **Google Cloud Console**:

The old single "OAuth consent screen" page is now split across three pages under
**Google Auth Platform**:

1. Create (or pick) a project.
2. [Branding](https://console.cloud.google.com/auth/branding) — app name, support email, developer contact.
3. [Audience](https://console.cloud.google.com/auth/audience) — set to **External**, then add your own
   address under **Test users**. While the app is unpublished only listed addresses can sign in.
4. [Data Access](https://console.cloud.google.com/auth/scopes) — `openid`, `userinfo.email`,
   `userinfo.profile`. `openid` often has to be added by hand. Nothing else: extra scopes trigger
   Google's verification review.
5. [Clients](https://console.cloud.google.com/auth/clients) → **Create client → Web application**:
   - **Authorised JavaScript origins**: `http://localhost:3000`
   - **Authorised redirect URI** — the *Supabase* callback, not your app:
     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```
6. Copy the client ID and secret.

In **Supabase → Authentication → Sign In / Providers**, on the **Supabase Auth** tab (not
*Third-Party Auth*, which is for replacing Supabase Auth with Clerk/Firebase/Auth0): enable Google,
paste the client ID and secret, save.

In **Supabase → Authentication → URL Configuration**: set Site URL to `http://localhost:3000` and
add `http://localhost:3000/**` under Redirect URLs. The `/**` allows post-login redirects to any
page on the site; Supabase refuses to redirect anywhere not on that list.

### 3. Paystack (test mode)

1. **Dashboard → Settings → API Keys & Webhooks**.
2. Copy the **Test Secret Key** (`sk_test_…`) into `PAYSTACK_SECRET_KEY`.
3. Set the **Test Webhook URL** to `https://your-domain/api/webhooks/paystack`.

For local webhook delivery, tunnel port 3000 and use the tunnel URL:

```bash
npx localtunnel --port 3000
```

In test mode Paystack's hosted page skips the card form entirely and offers **Success**,
**Bank Authentication** and **Declined** buttons, which is the quickest way to exercise each
branch. If you do want a card, `4084 0840 8408 4081` with CVV `408`, any future expiry and OTP
`123456` succeeds — see the [Paystack docs](https://paystack.com/docs/payments/test-payments/).

A webhook is **not** required to test locally: `/checkout/callback` verifies the transaction
server-side on its own.

> The webhook is the authoritative settlement path. The browser callback verifies independently, so an order is still fulfilled if the customer closes the tab — see [Payment flow](#payment-flow).

### 4. Mailgun

1. Add a domain, or use the sandbox domain Mailgun provides.
2. **Sending → Domain settings → API keys** → copy into `MAILGUN_API_KEY`, and the domain into `MAILGUN_DOMAIN`.
3. Sandbox domains only deliver to **authorised recipients** — add your own address under the sandbox domain's settings, or nothing will arrive.
4. EU-region accounts also need `MAILGUN_BASE_URL=https://api.eu.mailgun.net`.

### 5. Make yourself an admin

Put your Google address in `ADMIN_EMAILS` in `.env.local`, sign in, and `/admin` opens.

That env var is a bootstrap. Once you have signed in at least once, the durable version is a database flag:

```sql
update public.profiles set is_admin = true where email = 'you@example.com';
```

Then you can clear `ADMIN_EMAILS`.

---

## Payment flow

```
cart → POST /api/checkout → Paystack hosted page → customer pays
                                   ├── webhook  → /api/webhooks/paystack ─┐
                                   └── redirect → /checkout/callback ─────┤
                                                                          ↓
                                                        mark_order_paid() in Postgres
                                                        → stock decremented
                                                        → confirmation email sent once
```

Three things make this safe:

- **Prices come from the database.** `/api/checkout` ignores any price the browser sends; it re-reads every variant, re-checks stock, and recomputes the total. A tampered cart cannot change what is charged.
- **Settlement is atomic and idempotent.** `mark_order_paid()` is a conditional `UPDATE … WHERE status = 'pending'` that returns true for exactly one caller. The webhook and the callback both invoke it; whichever arrives second gets `false` and skips the email. No double-sends, no double stock decrements.
- **Webhooks are verified.** The HMAC-SHA512 signature is checked against the raw request body in constant time before the payload is parsed.

Amounts are stored as integers in the currency's minor unit (kobo for NGN) end to end, which is also what the Paystack API expects — so there is no float arithmetic and no conversion at the payment boundary.

## Security model

- **Row level security is on for every table.** Reads are public for active products and owner-scoped for orders. There are deliberately no insert/update policies: all writes go through server code using the service role key, which never reaches the browser.
- **Admin access is re-checked inside every server action**, not just in the `/admin` layout — a layout gate alone would not stop a crafted action request.
- **The service role key is server-only.** `src/lib/supabase/admin.ts` imports `server-only`, so importing it from a client component fails the build rather than leaking the key.

## Project layout

```
src/
  app/
    api/checkout/            price + stock validation, Paystack initialise
    api/webhooks/paystack/   signature-verified settlement
    auth/                    OAuth code exchange, sign out
    products/                catalog and product detail
    cart/ checkout/          cart, address form, payment callback
    orders/                  customer order history
    admin/                   dashboard, products, orders, server actions
  components/                UI, split client/server by need
  lib/
    supabase/                browser, server (RLS) and service-role clients
    paystack.ts              initialise, verify, webhook signature
    mailgun.ts               HTTP send + order confirmation template
    orders.ts                idempotent settlement
    catalog.ts               product queries
supabase/
  schema.sql                 tables, RLS, functions, storage bucket
  seed.sql                   demo catalog
```

## Configuration

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Origin used for Paystack and OAuth redirects. Must match the browser exactly. |
| `NEXT_PUBLIC_CURRENCY` | `NGN`, `GHS`, `ZAR`, `KES` or `USD`. Must match your Paystack account. |
| `SHIPPING_FEE_MINOR` | Flat shipping in minor units. `250000` = NGN 2,500. |
| `FREE_SHIPPING_THRESHOLD_MINOR` | Subtotal at which shipping becomes free. |
| `ADMIN_EMAILS` | Bootstrap admin access before `profiles.is_admin` is set. |

## Deploying

Set every variable from `.env.local` in your host's environment, with `NEXT_PUBLIC_SITE_URL` pointing at the real domain. Then update, in three places:

- Google Cloud Console — add the production JavaScript origin
- Supabase → Authentication → URL Configuration — Site URL and redirect URLs
- Paystack → Webhook URL — `https://your-domain/api/webhooks/paystack`

Swap `sk_test_…` for the live secret key when you are ready to take real money.

## Scripts

```bash
npm run dev        # development server
npm run build      # production build
npm start          # serve the production build
npm run typecheck  # tsc --noEmit
```
#   n o r t h b o u n d  
 