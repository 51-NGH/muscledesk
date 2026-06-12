import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Check, X, ArrowRight, Smartphone, Fingerprint, MessageSquare, Users, IndianRupee, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import muscleDeskLogo from "@/assets/muscledesk-logo.png";

const CANONICAL = "https://muscledesk.lovable.app/compare/muscledesk-vs-gymdesk";

const compareRows: Array<{ feature: string; muscledesk: string | boolean; gymdesk: string | boolean }> = [
  { feature: "Built for the Indian market (₹ pricing, +91 SMS, MSG91)", muscledesk: true, gymdesk: false },
  { feature: "Mobile-first dashboard (works great on a phone)", muscledesk: true, gymdesk: "Limited" },
  { feature: "PIN-based member portal (no email/password friction)", muscledesk: true, gymdesk: false },
  { feature: "Fingerprint attendance (ZKTeco ADMS / Push)", muscledesk: true, gymdesk: "Add-on" },
  { feature: "QR-code check-in", muscledesk: true, gymdesk: true },
  { feature: "WhatsApp follow-ups for expiring/expired members", muscledesk: true, gymdesk: false },
  { feature: "Built-in lead Kanban + Gmail lead capture", muscledesk: true, gymdesk: "Basic" },
  { feature: "Multi-branch consolidated analytics", muscledesk: true, gymdesk: true },
  { feature: "Lite plan starting free for small gyms", muscledesk: true, gymdesk: false },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "MuscleDesk vs Gymdesk: Honest Comparison for Indian Gym Owners (2026)",
  description:
    "Comparing MuscleDesk and Gymdesk across pricing, member portal, attendance, WhatsApp automation, and Indian-market fit so gym owners can choose the right gym management software.",
  url: CANONICAL,
  author: { "@type": "Organization", name: "MuscleDesk" },
  publisher: { "@type": "Organization", name: "MuscleDesk" },
  mainEntityOfPage: CANONICAL,
};

function Cell({ value }: { value: string | boolean }) {
  if (value === true)
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
        <Check className="h-4 w-4" /> Yes
      </span>
    );
  if (value === false)
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <X className="h-4 w-4" /> No
      </span>
    );
  return <span className="text-foreground/80">{value}</span>;
}

export default function CompareGymdesk() {
  return (
    <>
      <Helmet>
        <title>MuscleDesk vs Gymdesk: Best Gym Management Software in India (2026)</title>
        <meta
          name="description"
          content="MuscleDesk vs Gymdesk compared on pricing, member portal, fingerprint attendance, WhatsApp follow-ups, and Indian-market fit. See why gyms are switching."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:title" content="MuscleDesk vs Gymdesk: Best Gym Management Software in India (2026)" />
        <meta
          property="og:description"
          content="Head-to-head comparison of MuscleDesk and Gymdesk for Indian gym owners — pricing, member portal, attendance, WhatsApp, and more."
        />
        <meta property="og:image" content="https://muscledesk.lovable.app/pwa-512x512.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={CANONICAL} />
        <meta name="twitter:title" content="MuscleDesk vs Gymdesk: Best Gym Management Software in India (2026)" />
        <meta
          name="twitter:description"
          content="Head-to-head comparison of MuscleDesk and Gymdesk for Indian gym owners."
        />
        <meta name="twitter:image" content="https://muscledesk.lovable.app/pwa-512x512.png" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <main className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="border-b border-border">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={muscleDeskLogo} alt="MuscleDesk logo" className="h-8 w-8 object-contain" />
              <span className="font-bold tracking-tight">MuscleDesk</span>
            </Link>
            <Link to="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-3xl px-4 pt-12 pb-8 text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Comparison · 2026</p>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            MuscleDesk vs Gymdesk
          </h1>
          <p className="text-lg text-muted-foreground">
            An honest, India-first comparison of two gym management platforms — so you can pick what
            actually fits your gym, your members, and your team's phones.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link to="/login">
              <Button size="lg">
                Try MuscleDesk free <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Quick verdict */}
        <section className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-2">Quick verdict</h2>
            <p className="text-muted-foreground">
              Gymdesk is a well-known global player with a long feature list. <strong>MuscleDesk</strong> is
              built ground-up for Indian gyms: mobile-first dashboard, PIN-based member portal, MSG91 SMS,
              WhatsApp follow-ups via wa.me, fingerprint attendance, and a free Lite plan for small gyms.
              If you run a gym in India and your staff works mostly off a phone, MuscleDesk will feel
              closer to home.
            </p>
          </div>
        </section>

        {/* Feature comparison table */}
        <section className="mx-auto max-w-4xl px-4 py-8">
          <h2 className="text-2xl font-bold mb-4">Feature comparison</h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Feature</th>
                  <th className="px-4 py-3 font-semibold">MuscleDesk</th>
                  <th className="px-4 py-3 font-semibold">Gymdesk</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row) => (
                  <tr key={row.feature} className="border-t border-border">
                    <td className="px-4 py-3 align-top">{row.feature}</td>
                    <td className="px-4 py-3 align-top"><Cell value={row.muscledesk} /></td>
                    <td className="px-4 py-3 align-top"><Cell value={row.gymdesk} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Why MuscleDesk highlights */}
        <section className="mx-auto max-w-4xl px-4 py-8">
          <h2 className="text-2xl font-bold mb-6">Why Indian gyms pick MuscleDesk</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                Icon: IndianRupee,
                title: "Priced for Indian gyms",
                body: "₹ pricing, transparent Lite / Standard / Pro tiers, and a free Lite plan that actually runs a small gym.",
              },
              {
                Icon: Smartphone,
                title: "Mobile-first, not mobile-friendly",
                body: "Designed for the phone in your trainer's hand — 100vw sheets, swipe-friendly lists, no zooming.",
              },
              {
                Icon: Fingerprint,
                title: "Fingerprint + QR attendance",
                body: "Direct ZKTeco ADMS/Push integration, plus QR check-in via the member portal — same dashboard.",
              },
              {
                Icon: MessageSquare,
                title: "WhatsApp + SMS that work in India",
                body: "MSG91 SMS for OTP and onboarding, plus wa.me WhatsApp follow-ups for expiring and inactive members.",
              },
              {
                Icon: Users,
                title: "Real member portal",
                body: "PIN-based login (no passwords), bookings, workouts, measurements, and renewal requests in one place.",
              },
              {
                Icon: Zap,
                title: "Set up in minutes",
                body: "Add your first member and take attendance in under 10 minutes — no onboarding calls required.",
              },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-5">
                <Icon className="h-5 w-5 text-primary mb-2" />
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 py-8">
          <h2 className="text-2xl font-bold mb-4">Frequently asked questions</h2>
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-1">Is MuscleDesk a true Gymdesk alternative?</h3>
              <p className="text-sm text-muted-foreground">
                Yes — MuscleDesk covers the core management workflows (members, attendance, payments,
                plans, multi-branch analytics) and adds India-specific tooling Gymdesk doesn't natively
                ship, like MSG91 SMS, WhatsApp follow-ups, and PIN-based member login.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-1">Can I migrate from Gymdesk?</h3>
              <p className="text-sm text-muted-foreground">
                Yes. MuscleDesk supports bulk member import from CSV with a 30-minute revert window, so
                you can test imports safely before committing.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-1">What does MuscleDesk cost?</h3>
              <p className="text-sm text-muted-foreground">
                Three tiers — Lite, Standard, and Pro — priced for the Indian market. The Lite plan is
                free and is enough to run a small single-branch gym end-to-end.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-3xl px-4 py-12 text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to try MuscleDesk?</h2>
          <p className="text-muted-foreground mb-6">
            Start free on the Lite plan. Add members, take attendance, send renewal reminders — all from
            your phone.
          </p>
          <Link to="/login">
            <Button size="lg">
              Get started free <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </section>

        <footer className="border-t border-border mt-8">
          <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} MuscleDesk</span>
            <Link to="/" className="hover:text-foreground">Home</Link>
          </div>
        </footer>
      </main>
    </>
  );
}
