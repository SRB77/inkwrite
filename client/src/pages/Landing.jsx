import { Link } from "react-router-dom";
import {
  ArrowRight,
  Download,
  MousePointer2,
  MousePointerClick,
  PenLine,
  Quote,
  Shapes,
  Share2,
  Sparkles,
  Star,
  Users,
  WandSparkles,
} from "lucide-react";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { initials } from "../lib/utils";

const STEPS = [
  {
    icon: MousePointerClick,
    title: "Open a canvas",
    body: "Start from a blank infinite board or a template. No setup, no downloads — just click and create.",
  },
  {
    icon: WandSparkles,
    title: "Think with AI",
    body: "Prompt the canvas to generate sticky notes, outlines and summaries. Shape your ideas as fast as you have them.",
  },
  {
    icon: Share2,
    title: "Share & ship",
    body: "Invite your team to edit live, then export the result to PNG or SVG for docs, decks and beyond.",
  },
];

// Placeholder social proof — replace with real numbers and quotes before launch.
const STATS = [
  { value: "50k+", label: "Boards created" },
  { value: "120+", label: "Countries" },
  { value: "4.9/5", label: "Average rating" },
  { value: "99.9%", label: "Uptime" },
];

const TESTIMONIALS = [
  {
    quote:
      "It replaced three tools for us. Brainstorming, diagramming and note-taking now live on one canvas — and the AI actually saves us hours.",
    name: "Ava Chen",
    role: "Product Lead, Northwind",
  },
  {
    quote:
      "The real-time collaboration is buttery smooth. Our remote design reviews finally feel like we're in the same room.",
    name: "Marcus Reed",
    role: "Design Director, Loop",
  },
  {
    quote:
      "I turn a rough prompt into a full outline in seconds, then clean it up by hand. It's the fastest thinking tool I've used.",
    name: "Priya Nair",
    role: "Founder, Studio Kite",
  },
];

const FEATURES = [
  {
    icon: Shapes,
    title: "Every tool you need",
    body: "Text, sticky notes, shapes, lines, arrows, freehand drawing and bullet lists on one infinite canvas.",
  },
  {
    icon: Sparkles,
    title: "AI brainstorming",
    body: "Turn a prompt into a wall of sticky notes or a structured outline. Summarize a busy board in a click.",
  },
  {
    icon: Users,
    title: "Real-time collaboration",
    body: "See teammates' cursors and edits live. Share a board with editors and viewers.",
  },
  {
    icon: Download,
    title: "Export anywhere",
    body: "Download your whiteboard as a crisp PNG or a scalable SVG to drop into docs and decks.",
  },
];

function Nav({ user }) {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
      <Link to="/" className="focus-ring inline-flex items-center gap-2.5 rounded-xl">
        <span className="brand-gradient grid h-9 w-9 place-items-center rounded-xl text-white">
          <PenLine className="h-4.5 w-4.5" />
        </span>
        <span className="font-display text-xl font-bold">Inkwrite</span>
      </Link>

      <nav className="flex items-center gap-2">
        {user ? (
          <Button as={Link} to="/dashboard" size="sm">
            Open app
          </Button>
        ) : (
          <>
            <Button as={Link} to="/login" variant="ghost" size="sm">
              Sign in
            </Button>
            <Button as={Link} to="/register" size="sm">
              Get started
            </Button>
          </>
        )}
      </nav>
    </header>
  );
}

function CanvasPreview() {
  return (
    <section className="mx-auto max-w-5xl px-6 pb-20">
      <div
        className="card canvas-bg-dots rounded-3xl p-8 shadow-[var(--shadow-lift)]"
        style={{ backgroundSize: "22px 22px", backgroundColor: "#fff" }}
      >
        <div aria-hidden="true" className="no-select flex min-h-56 flex-wrap items-center justify-center gap-6 sm:gap-10">
          <div
            className="rounded-2xl px-6 py-5 font-['Caveat'] text-2xl font-semibold text-ink shadow-[var(--shadow-soft)]"
            style={{ backgroundColor: "#fde68a", transform: "rotate(-3deg)" }}
          >
            💡 Brainstorm ideas
          </div>

          <div
            className="rounded-2xl bg-surface px-8 py-5 font-display text-lg font-semibold text-ink shadow-[var(--shadow-soft)]"
            style={{ border: "3px solid var(--color-brand-500)" }}
          >
            Plan
          </div>

          <svg width="72" height="28" viewBox="0 0 72 28" fill="none" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 18 C 22 6, 44 6, 64 14" />
            <path d="M54 6 L 65 14 L 54 22" />
          </svg>

          <div
            className="rounded-full px-6 py-3 text-base font-semibold text-ink shadow-[var(--shadow-soft)]"
            style={{ backgroundColor: "#bfdbfe", transform: "rotate(2deg)" }}
          >
            Ship 🚀
          </div>
        </div>
      </div>
    </section>
  );
}

function Eyebrow({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-muted shadow-[var(--shadow-card)]">
      <Icon className="h-3.5 w-3.5 text-brand-500" />
      {children}
    </span>
  );
}

function SectionHeading({ eyebrow, icon, title, subtitle }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Eyebrow icon={icon}>{eyebrow}</Eyebrow>
      <h2 className="mt-5 font-display text-3xl font-bold sm:text-4xl">{title}</h2>
      {subtitle && <p className="mx-auto mt-4 max-w-xl text-muted">{subtitle}</p>}
    </div>
  );
}

function HowItWorks() {
  return (
    <section className="mx-auto max-w-5xl px-6 pb-24">
      <SectionHeading
        eyebrow="How it works"
        icon={MousePointerClick}
        title={
          <>
            From blank canvas to <span className="text-gradient">shipped idea</span>
          </>
        }
        subtitle="Three steps is all it takes to go from a spark to something your whole team can build on."
      />
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <div key={title} className="card relative overflow-hidden rounded-2xl p-6">
            <span
              aria-hidden="true"
              className="no-select absolute -top-3 right-2 font-display text-7xl font-bold text-surface-2"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="brand-gradient relative grid h-12 w-12 place-items-center rounded-2xl text-white shadow-[var(--shadow-brand)]">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="relative mt-5 font-display text-lg font-semibold">{title}</h3>
            <p className="relative mt-2 text-sm leading-relaxed text-muted">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="mx-auto max-w-5xl px-6 pb-24">
      <div className="card grid grid-cols-2 overflow-hidden rounded-3xl md:grid-cols-4">
        {STATS.map(({ value, label }, i) => (
          <div
            key={label}
            className={`px-4 py-8 text-center ${i % 2 ? "border-l" : ""} ${i > 1 ? "border-t md:border-t-0" : ""} ${i === 2 ? "md:border-l" : ""}`}
          >
            <div className="text-gradient tabular font-display text-4xl font-bold">{value}</div>
            <div className="mt-1.5 text-xs font-medium tracking-wider text-faint uppercase">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="mx-auto max-w-5xl px-6 pb-24">
      <SectionHeading eyebrow="Loved by makers" icon={Star} title="Teams do their best thinking here" />
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map(({ quote, name, role }) => (
          <figure
            key={name}
            className="card flex flex-col rounded-2xl p-6 transition-all duration-300 ease-[var(--ease-spring)] hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
          >
            <Quote className="h-6 w-6 text-brand-300" />
            <blockquote className="mt-4 flex-1 leading-relaxed text-ink">{quote}</blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <span className="brand-gradient grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-semibold text-white">
                {initials(name)}
              </span>
              <span>
                <span className="block font-semibold">{name}</span>
                <span className="block text-sm text-muted">{role}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function FinalCta({ user }) {
  return (
    <section className="mx-auto max-w-5xl px-6 pb-24">
      <div className="brand-gradient relative overflow-hidden rounded-[2rem] px-6 py-16 text-center text-white shadow-[var(--shadow-lift)] sm:px-12 sm:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1.2px, transparent 1.2px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-white/20 blur-3xl"
        />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold sm:text-4xl">
            Your next big idea starts on a blank canvas.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/75">
            Join thousands of teams thinking, drawing and shipping faster. Free to start — no credit card required.
          </p>
          <Button
            as={Link}
            to={user ? "/dashboard" : "/register"}
            size="lg"
            className="mt-8 shadow-[0_10px_28px_rgba(0,0,0,.25)] ring-1 ring-white/10 [background:rgba(10,32,22,.45)] hover:[background:rgba(10,32,22,.6)]"
          >
            Open the app
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-bg">
      <Nav user={user} />

      <section className="animate-in mx-auto max-w-4xl px-6 pt-16 pb-10 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-muted shadow-[var(--shadow-card)]">
          <Sparkles className="h-3.5 w-3.5 text-brand-500" />
          AI-powered whiteboard notes
        </span>

        <h1 className="mt-6 font-display text-5xl leading-[1.05] font-bold sm:text-6xl">
          The infinite canvas for
          <br />
          <span className="text-gradient">notes that think with you.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
          Sketch, diagram and brainstorm freely. Drop text, shapes and sticky notes, draw by hand, and let AI expand
          your ideas — all in real time.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button as={Link} to={user ? "/dashboard" : "/register"} size="lg">
            <MousePointer2 className="h-4.5 w-4.5" />
            Start whiteboarding
          </Button>
          <Button as={Link} to="/login" variant="secondary" size="lg">
            Sign in
          </Button>
        </div>
      </section>

      <CanvasPreview />

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="card rounded-2xl p-6">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
            <p className="mt-1.5 text-sm text-muted">{body}</p>
          </div>
        ))}
      </section>

      <HowItWorks />
      <Stats />
      <Testimonials />
      <FinalCta user={user} />

      <footer className="border-t border-line py-8 text-center text-sm text-muted">
        Built with the PERN stack · React · Express · PostgreSQL · Socket.IO
      </footer>
    </div>
  );
}
