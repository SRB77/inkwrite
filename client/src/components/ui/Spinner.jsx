import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

export default function Spinner({ label, className }) {
  return (
    <div className={cn("inline-flex items-center gap-2 text-sm text-muted", className)}>
      <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
      {label && <span>{label}</span>}
    </div>
  );
}

export function FullScreenSpinner({ label = "Loading..." }) {
  return (
    <div className="grid h-screen place-items-center bg-bg">
      <Spinner label={label} />
    </div>
  );
}

export { Spinner };
