import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PRIVACY_SECTIONS = [
  {
    heading: "Information we collect",
    body: "We collect information you provide when you register, book services, or contact support — such as name, phone number, location for trips and deliveries, and payment-related metadata handled by our payment partners.",
  },
  {
    heading: "How we use data",
    body: "We use data to operate matching, safety, fraud prevention, customer support, and to improve the Pugau experience. Marketing uses are limited to what you consent to in the app settings.",
  },
  {
    heading: "Sharing",
    body: "We share data with riders, restaurants, vendors, or parcel partners only as needed to complete your booking. We may disclose information when required by law.",
  },
  {
    heading: "Contact",
    body: "For privacy questions, contact hello@pugau.com or use in-app support.",
  },
];

const TERMS_SECTIONS = [
  {
    heading: "Acceptance",
    body: "By using Pugau websites or apps, you agree to these terms and to our Privacy Policy.",
  },
  {
    heading: "Services",
    body: "Pugau provides a marketplace connecting users with independent riders, restaurants, vendors, and other partners. We are not the direct provider of every ride or delivery unless stated otherwise.",
  },
  {
    heading: "Accounts & safety",
    body: "You are responsible for your account credentials and for activity under your account. Misuse, fraud, or harassment may result in suspension.",
  },
  {
    heading: "Limitation of liability",
    body: "To the extent permitted by law, Pugau is not liable for indirect or consequential damages arising from use of the platform. Nothing here limits rights that cannot be waived under applicable law.",
  },
];

export default function LegalPage({ variant }: { variant: "privacy" | "terms" }) {
  const isPrivacy = variant === "privacy";
  const title = isPrivacy ? "Privacy Policy" : "Terms of Service";
  const sections = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/login">Admin</Link>
          </Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-2">Last updated: April 2026. This is a general template — have it reviewed by counsel before production use.</p>
        <div className="mt-10 space-y-8">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-lg font-semibold">{s.heading}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
