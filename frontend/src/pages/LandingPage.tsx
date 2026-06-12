import { type MouseEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ContactRound,
  FileBarChart,
  Handshake,
  Layers3,
  ListChecks,
  MessageSquareText,
  Network,
  PieChart,
  Sparkles,
  Target,
  TimerReset,
  UsersRound,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type IconCard = {
  description: string;
  icon: LucideIcon;
  title: string;
};

type PricingPlan = {
  cta: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  name: string;
  price: string;
};

const navItems = ["Features", "Solutions", "Pricing", "Resources"];
const sectionScrollDurationMs = 420;
const stickyHeaderOffsetPx = 80;

function scrollToSection(event: MouseEvent<HTMLAnchorElement>, sectionId: string) {
  event.preventDefault();

  const section = document.getElementById(sectionId);

  if (!section) {
    return;
  }

  window.history.pushState(null, "", `#${sectionId}`);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    section.scrollIntoView();
    return;
  }

  const startY = window.scrollY;
  const targetY = section.getBoundingClientRect().top + window.scrollY - stickyHeaderOffsetPx;
  const distance = targetY - startY;
  const startTime = window.performance.now();

  const animateScroll = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / sectionScrollDurationMs, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);

    window.scrollTo(0, startY + distance * easedProgress);

    if (progress < 1) {
      window.requestAnimationFrame(animateScroll);
    }
  };

  window.requestAnimationFrame(animateScroll);
}

const metrics = [
  { label: "contacts managed", value: "2,000+" },
  { label: "faster follow-ups", value: "35%" },
  { label: "clearer sales visibility", value: "3x" },
];

const problemCards: IconCard[] = [
  {
    title: "Scattered customer data",
    description: "Notes, contact details, and deal context get buried across spreadsheets, chats, and inboxes.",
    icon: Network,
  },
  {
    title: "Missed follow-ups",
    description: "Important reminders are easy to lose when every rep manages tasks in a different place.",
    icon: Bell,
  },
  {
    title: "Messy pipelines",
    description: "Teams struggle to see which deals need attention and where momentum is starting to fade.",
    icon: Layers3,
  },
  {
    title: "Too much complexity",
    description: "Traditional CRMs often ask teams to configure more than they need before work can begin.",
    icon: Workflow,
  },
];

const solutionFeatures: IconCard[] = [
  {
    title: "Unified customer profiles",
    description: "Bring contact details, notes, deals, and ownership into one calm record.",
    icon: ContactRound,
  },
  {
    title: "Visual sales pipeline",
    description: "Track every opportunity from first conversation through close with clear stages.",
    icon: Target,
  },
  {
    title: "Smart follow-up reminders",
    description: "Keep the next best action visible so conversations never go cold.",
    icon: CalendarCheck,
  },
  {
    title: "Task and activity tracking",
    description: "Turn customer work into focused daily actions with a shared activity trail.",
    icon: ListChecks,
  },
  {
    title: "Team collaboration",
    description: "Give sales, service, and operations teams one workspace for relationship work.",
    icon: UsersRound,
  },
  {
    title: "Simple reporting dashboard",
    description: "Monitor pipeline health, revenue forecasts, and follow-up consistency at a glance.",
    icon: FileBarChart,
  },
];

const featureCards: IconCard[] = [
  {
    title: "Lead & Contact Management",
    description: "Capture every person, account, and conversation with clean ownership and context.",
    icon: ContactRound,
  },
  {
    title: "Pipeline Tracking",
    description: "Move deals through a focused board that makes stuck opportunities easy to spot.",
    icon: BarChart3,
  },
  {
    title: "Follow-Up Reminders",
    description: "Schedule next steps, see overdue work, and keep customer promises visible.",
    icon: Bell,
  },
  {
    title: "Activity Timeline",
    description: "See calls, emails, notes, tasks, and handoffs in one readable history.",
    icon: Clock3,
  },
  {
    title: "Team Workspace",
    description: "Coordinate leads, tasks, and updates without switching tools all day.",
    icon: UsersRound,
  },
  {
    title: "Reports & Insights",
    description: "Track performance with practical metrics your team can act on right away.",
    icon: PieChart,
  },
];

const workflowSteps = [
  {
    title: "Capture leads",
    description: "Add inbound leads, imported contacts, and new inquiries into one shared workspace.",
  },
  {
    title: "Organize your pipeline",
    description: "Prioritize opportunities by stage, owner, value, and expected close date.",
  },
  {
    title: "Follow up on time",
    description: "Use reminders and task queues to keep every customer conversation moving.",
  },
  {
    title: "Close and retain",
    description: "Turn won deals into active customers with clear next steps and service history.",
  },
];

const useCases: IconCard[] = [
  {
    title: "Sales Teams",
    description: "Stay consistent with leads, deals, follow-ups, and revenue visibility.",
    icon: Handshake,
  },
  {
    title: "Service Teams",
    description: "Keep customer requests, activity, and ownership easy to understand.",
    icon: MessageSquareText,
  },
  {
    title: "Founders",
    description: "Run a lightweight CRM process without hiring operations support too early.",
    icon: Sparkles,
  },
  {
    title: "Operations Teams",
    description: "Create repeatable workflows for handoffs, tasks, and customer accountability.",
    icon: Building2,
  },
];

const pricingPlans: PricingPlan[] = [
  {
    name: "Starter",
    price: "$19",
    description: "For small teams organizing their first shared CRM process.",
    features: ["Core contacts and leads", "Simple pipeline board", "Follow-up reminders"],
    cta: "Start Starter",
  },
  {
    name: "Growth",
    price: "$49",
    description: "For growing teams that need stronger collaboration and reporting.",
    features: ["Team task workspace", "Activity timeline", "Pipeline and forecast reports"],
    cta: "Start Growth",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$99",
    description: "For larger teams standardizing customer workflows across departments.",
    features: ["Advanced permissions", "Priority support", "Custom workflow setup"],
    cta: "Contact Sales",
  },
];

const testimonials = [
  {
    quote: "Lifely helped our team stop losing leads and finally stay consistent with follow-ups.",
    name: "Maya Pratama",
    role: "Sales Lead, Skyline Partners",
  },
  {
    quote: "The dashboard gives our team a calm daily view of who needs attention and what has changed.",
    name: "Daniel Hart",
    role: "Founder, Northline Studio",
  },
  {
    quote: "We moved from scattered spreadsheets to one clean workspace without slowing the team down.",
    name: "Ariana Lee",
    role: "Operations Manager, Clearpath Services",
  },
];

const faqs = [
  {
    question: "Is Lifely only for sales teams?",
    answer:
      "No. Lifely works well for sales, service, founder-led, and operations teams that need to manage relationships, follow-ups, tasks, and customer activity.",
  },
  {
    question: "Can I import existing contacts?",
    answer:
      "Yes. Lifely is designed to help teams bring existing customer and lead records into a cleaner workspace so they can start working from a shared source of truth.",
  },
  {
    question: "Does Lifely support reminders?",
    answer:
      "Yes. Follow-up reminders and task tracking are central to the workspace, helping teams see what is due today, what is overdue, and what needs attention next.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes. Teams can start a trial without a credit card and set up a workspace in minutes.",
  },
];

function SectionHeader({
  align = "center",
  description,
  eyebrow,
  title,
}: {
  align?: "center" | "left";
  description?: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <div className={cn("mx-auto max-w-3xl", align === "center" ? "text-center" : "text-left")}>
      {eyebrow ? (
        <Badge variant="info" className="mb-3">
          {eyebrow}
        </Badge>
      ) : null}
      <h2 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">{title}</h2>
      {description ? <p className="mt-4 text-base leading-7 text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function IconFeatureCard({ card }: { card: IconCard }) {
  const Icon = card.icon;

  return (
    <Card className="group h-full bg-white transition duration-200 hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg">
      <CardHeader>
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-sky-100 bg-sky-50 text-sky-600 transition-colors group-hover:bg-sky-100">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="pt-3 text-base leading-6">{card.title}</CardTitle>
        <CardDescription className="leading-6">{card.description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function HeroDashboardMockup() {
  const stages = [
    { name: "New", value: "42", width: "72%" },
    { name: "Qualified", value: "28", width: "58%" },
    { name: "Proposal", value: "16", width: "46%" },
  ];

  return (
    <div className="relative">
      <div className="absolute -left-4 top-10 h-36 w-36 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="absolute -bottom-6 right-4 h-32 w-32 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/80">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <p className="text-xs font-medium uppercase text-sky-600">Today in Lifely</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">Workspace overview</p>
          </div>
          <Badge variant="success">Live</Badge>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-950">Leads pipeline</p>
              <Badge variant="info">86 active</Badge>
            </div>
            <div className="mt-4 space-y-4">
              {stages.map((stage) => (
                <div key={stage.name}>
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
                    <span>{stage.name}</span>
                    <span>{stage.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white">
                    <div className="h-2 rounded-full bg-sky-500" style={{ width: stage.width }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm font-semibold text-slate-950">Customer profile</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-100 text-sm font-semibold text-sky-700">AR</div>
              <div>
                <p className="text-sm font-semibold text-slate-950">Ari Realty Group</p>
                <p className="text-xs text-muted-foreground">Growth account</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-muted-foreground">Deal value</p>
                <p className="mt-1 font-semibold text-slate-950">$48K</p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-muted-foreground">Owner</p>
                <p className="mt-1 font-semibold text-slate-950">Maya</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-700">
              <TimerReset className="h-4 w-4" />
              Follow-up reminders
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-950">12</p>
            <p className="text-xs text-muted-foreground">due before 4 PM</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
              <CircleDollarSign className="h-4 w-4" />
              Revenue summary
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-950">$124K</p>
            <p className="text-xs text-muted-foreground">forecast this month</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-sky-700">
              <Clock3 className="h-4 w-4" />
              Activity timeline
            </div>
            <div className="mt-3 space-y-2 text-xs text-slate-600">
              <p>Call completed</p>
              <p>Email opened</p>
              <p>Proposal sent</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductPreview() {
  const followUps = ["Call Rowan about renewal", "Send quote to Clearpath", "Review proposal notes"];
  const activities = ["New lead assigned to Maya", "Proposal moved to review", "Task completed by Daniel"];
  const revenueForecast = [45, 62, 54, 78, 70, 86, 92];

  return (
    <div className="mx-auto mt-10 max-w-6xl rounded-lg border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-3 shadow-2xl shadow-slate-200/70">
      <div className="rounded-lg border bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-sky-600">Daily focus</p>
            <h3 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">Customer workspace</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Active deals", "34"],
              ["New leads", "18"],
              ["Overdue tasks", "5"],
              ["Forecast", "$82K"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border bg-slate-50 px-4 py-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr_0.9fr]">
          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-950">Today's follow-ups</p>
              <Badge variant="warning">3 due</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {followUps.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-md bg-white p-3 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-sky-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-950">Revenue forecast</p>
              <Badge variant="success">On track</Badge>
            </div>
            <div className="mt-5 flex h-48 items-end gap-3 rounded-lg bg-slate-50 p-4" aria-label="Revenue forecast by week">
              {revenueForecast.map((value, index) => (
                <div key={`week-${index + 1}`} className="flex h-full flex-1 flex-col justify-end gap-2">
                  <div className="flex min-h-0 flex-1 items-end">
                  <div
                      className={cn("w-full rounded-t-md transition-all", index === revenueForecast.length - 1 ? "bg-sky-500" : "bg-sky-200")}
                      style={{ height: `${value}%` }}
                      title={`Week ${index + 1}: ${value}% forecast confidence`}
                  />
                  </div>
                  <span className="text-center text-[11px] text-muted-foreground">{`W${index + 1}`}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="font-semibold text-slate-950">Recent customer activity</p>
            <div className="mt-4 space-y-4">
              {activities.map((activity) => (
                <div key={activity} className="flex gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-sky-500" />
                  <div>
                    <p className="text-sm text-slate-950">{activity}</p>
                    <p className="text-xs text-muted-foreground">Updated minutes ago</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-lg font-semibold tracking-normal text-slate-950" aria-label="Lifely CRM home">
            Lifely CRM
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex" aria-label="Primary navigation">
            {navItems.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="transition-colors hover:text-sky-600"
                onClick={(event) => scrollToSection(event, item.toLowerCase())}
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link to="/login">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-24">
        <div>
          <Badge variant="info" className="mb-5">
            Calm CRM for growing teams
          </Badge>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
            Manage leads, customers, and follow-ups in one calm CRM workspace.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Lifely helps growing teams organize contacts, track deals, automate follow-ups, and stay focused without the complexity
            of traditional CRMs.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link to="/login">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#dashboard-preview" onClick={(event) => scrollToSection(event, "dashboard-preview")}>
                View Demo
              </a>
            </Button>
          </div>
          <p className="mt-4 text-sm text-slate-500">No credit card required. Set up your workspace in minutes.</p>
        </div>
        <HeroDashboardMockup />
      </section>

      <section className="border-y bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Trusted by growing sales, service, and operations teams" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {metrics.map((metric) => (
              <Card key={metric.label} className="bg-slate-50 text-center transition duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-lg">
                <CardContent className="p-6">
                  <p className="text-3xl font-semibold text-slate-950">{metric.value}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{metric.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeader title="CRM should help you focus, not slow you down." />
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {problemCards.map((card) => (
            <IconFeatureCard key={card.title} card={card} />
          ))}
        </div>
      </section>

      <section id="solutions" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="A simpler way to manage customer relationships."
            description="Lifely brings your contacts, deals, tasks, reminders, and team activity into one organized CRM workspace."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {solutionFeatures.map((card) => (
              <IconFeatureCard key={card.title} card={card} />
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeader title="Everything your team needs to stay on top of customers" />
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((card) => (
            <IconFeatureCard key={card.title} card={card} />
          ))}
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader title="From new lead to loyal customer in a simple flow" />
          <div className="mt-10 grid gap-4 lg:grid-cols-4">
            {workflowSteps.map((step, index) => (
              <Card key={step.title} className="relative bg-white transition duration-200 hover:-translate-y-1 hover:shadow-lg">
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <CardTitle className="pt-3">{step.title}</CardTitle>
                  <CardDescription className="leading-6">{step.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="dashboard-preview" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeader title="A calm CRM dashboard built for daily focus" />
        <ProductPreview />
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Built for teams that manage relationships" />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {useCases.map((card) => (
              <IconFeatureCard key={card.title} card={card} />
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeader title="Simple pricing that grows with your team" />
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                "bg-white transition duration-200 hover:-translate-y-1 hover:shadow-lg",
                plan.highlighted && "border-sky-300 shadow-lg shadow-sky-100",
              )}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {plan.highlighted ? <Badge variant="info">Popular</Badge> : null}
                </div>
                <div className="pt-4">
                  <span className="text-4xl font-semibold text-slate-950">{plan.price}</span>
                  <span className="text-sm text-muted-foreground"> / user</span>
                </div>
                <CardDescription className="leading-6">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm text-slate-700">
                      <Check className="mt-0.5 h-4 w-4 text-sky-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="mt-6 w-full" variant={plan.highlighted ? "default" : "outline"} asChild>
                  <Link to="/login">{plan.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="resources" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Teams feel the difference quickly" />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name} className="bg-slate-50">
                <CardContent className="p-6">
                  <p className="text-base leading-7 text-slate-700">"{testimonial.quote}"</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sm font-semibold text-sky-700">
                      {testimonial.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeader title="Questions teams ask before getting started" />
        <Card className="mt-10 bg-white">
          <CardContent className="p-6">
            <Accordion type="single" collapsible defaultValue="faq-0">
              {faqs.map((faq, index) => (
                <AccordionItem key={faq.question} value={`faq-${index}`}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-lg border border-sky-100 bg-sky-500 px-6 py-12 text-center text-white shadow-2xl shadow-sky-200/70 sm:px-10">
          <Zap className="mx-auto h-9 w-9" />
          <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-semibold tracking-normal sm:text-4xl">
            Start managing customer relationships with more clarity.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-sky-50">
            Create your Lifely workspace and organize your leads, customers, and follow-ups in minutes.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/login">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white bg-transparent text-white hover:bg-white/10" asChild>
              <a href="#dashboard-preview" onClick={(event) => scrollToSection(event, "dashboard-preview")}>
                Book a Demo
              </a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
