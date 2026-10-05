/**
 * Shown instead of the storefront when the Supabase environment variables are
 * missing, so a fresh clone boots to instructions rather than a stack trace.
 */
export function SetupNotice() {
  const steps = [
    {
      title: "Create a Supabase project",
      body: "From Settings → API Keys copy the project URL, the publishable key (older projects call it anon) and the secret key (older projects call it service_role).",
    },
    {
      title: "Run the SQL",
      body: "Paste supabase/schema.sql then supabase/seed.sql into the Supabase SQL editor.",
    },
    {
      title: "Add your keys",
      body: "Copy .env.local.example to .env.local and fill in Supabase, Paystack and Mailgun.",
    },
    {
      title: "Enable Google sign-in",
      body: "Create an OAuth client in Google Cloud Console and paste it into Supabase → Authentication → Providers → Google.",
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-5 py-24">
      <p className="eyebrow">Setup required</p>
      <h1 className="display mt-2 text-3xl font-bold tracking-tight">
        Connect Supabase to start selling
      </h1>
      <p className="mt-3 text-ink-muted">
        The storefront is installed but has no database yet. The README walks through each of these
        in detail.
      </p>

      <ol className="mt-8 space-y-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-4 bg-surface p-5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
              {index + 1}
            </span>
            <div>
              <h2 className="font-semibold text-ink">{step.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
