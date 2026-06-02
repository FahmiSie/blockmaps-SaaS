import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Pricing | BlockMaps",
};

const PLANS = [
  {
    name: "Starter",
    price: "Rp 0",
    period: "forever",
    description: "Perfect for testing and small operations.",
    features: [
      "Max 3 active zones",
      "Basic inventory tracking",
      "Basic delivery tracking",
      "Community support",
    ],
    cta: "Start for free",
    href: "/login",
  },
  {
    name: "Growth",
    price: "Rp 99.000",
    period: "/ month",
    description: "For growing facilities that need more control.",
    features: [
      "Max 15 active zones",
      "Full inventory management",
      "Delivery workflows",
      "Basic analytics",
      "User management",
    ],
    cta: "Upgrade to Growth",
    href: "/login",
    popular: true,
  },
  {
    name: "Pro",
    price: "Rp 249.000",
    period: "/ month",
    description: "Advanced tools for complex logistics operations.",
    features: [
      "Max 50 active zones",
      "Advanced analytics",
      "Priority email support",
      "Company branding",
      "Export reports",
    ],
    cta: "Upgrade to Pro",
    href: "/login",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact sales",
    description: "For large scale operations with custom requirements.",
    features: [
      "Unlimited zones",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "On-premise deployment option",
    ],
    cta: "Contact Sales",
    href: "mailto:sales@blockmaps.com",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center py-24 px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mb-16">
        <h1 className="text-display mb-4">Simple, transparent pricing</h1>
        <p className="text-body text-muted-foreground text-lg">
          Choose the plan that fits your facility. Scale as you grow.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl w-full">
        {PLANS.map((plan) => (
          <div key={plan.name} className={`flex flex-col rounded-xl border p-6 relative bg-[var(--bg-surface)] ${plan.popular ? 'border-primary/50' : 'border-[var(--border-base)]'}`}>
            {plan.popular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                Most Popular
              </div>
            )}
            <div className="mb-6">
              <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              <div className="mt-4 flex items-baseline text-3xl font-bold">
                {plan.price}
                <span className="ml-1 text-sm font-medium text-muted-foreground">{plan.period}</span>
              </div>
            </div>
            <div className="flex-1 mb-6">
              <ul className="space-y-4">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-auto">
              <Button asChild variant={plan.popular ? "default" : "outline"} className="w-full">
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
