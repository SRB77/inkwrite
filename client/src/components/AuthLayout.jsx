import { Link } from "react-router-dom";
import { PenLine } from "lucide-react";
import { cn } from "../lib/utils";

function Logo({ light = false, className }) {
  return (
    <Link to="/" className={cn("focus-ring inline-flex items-center gap-2.5 rounded-xl", className)}>
      <span
        className={cn(
          "grid h-9 w-9 place-items-center rounded-xl",
          light ? "bg-white/15 text-white" : "brand-gradient text-white shadow-[var(--shadow-brand)]",
        )}
      >
        <PenLine className="h-4.5 w-4.5" />
      </span>
      <span className={cn("font-display text-xl font-bold", light ? "text-white" : "text-ink")}>Inkwrite</span>
    </Link>
  );
}

const FEATURES = ["✎ Freehand & shapes", "✦ AI brainstorm", "◐ Real-time"];

export default function AuthLayout({ title, subtitle, children, footer, wide = false }) {
  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-2">
      <aside className="brand-gradient relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <svg
          aria-hidden="true"
          viewBox="0 0 400 400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="pointer-events-none absolute -right-24 -bottom-24 h-[30rem] w-[30rem] opacity-20"
        >
          <circle cx="200" cy="200" r="150" />
          <path d="M60 260 C 130 120, 270 120, 340 230" />
        </svg>

        <Logo light className="relative" />

        <div className="relative max-w-md">
          <h2 className="font-display text-4xl leading-tight font-bold">Think it. Draw it. Share it.</h2>
          <p className="mt-4 text-white/80">
            An infinite whiteboard for notes, diagrams, sketches and sticky-note brainstorms — with AI and live
            collaboration built in.
          </p>
        </div>

        <div className="relative flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
          {FEATURES.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className={cn("w-full animate-in", wide ? "max-w-md" : "max-w-sm")}>
          <Logo className="mb-8 lg:hidden" />
          {title && <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>}
          {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
