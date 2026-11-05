import { Link } from "react-router-dom";
import { LogIn, Sparkles } from "lucide-react";

export default function DemoBanner() {
  return (
    <div className="pointer-events-auto fixed top-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-brand-200 bg-white/95 px-3 py-2 text-xs font-medium text-muted shadow-[var(--shadow-card)] backdrop-blur sm:text-sm">
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand-600" />
      <span>Demo mode — your canvas is temporary.</span>
      <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-800">
        <LogIn className="h-3.5 w-3.5" />
        Sign in to save
      </Link>
    </div>
  );
}
