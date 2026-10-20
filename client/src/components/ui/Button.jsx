import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

const VARIANTS = {
  primary: "brand-gradient text-white shadow-[var(--shadow-brand)] hover:brightness-[1.07]",
  secondary:
    "bg-surface hover:bg-surface-2 text-ink border border-line shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-soft)]",
  ghost: "bg-transparent hover:bg-surface-2 text-muted hover:text-ink",
  danger: "bg-danger text-white hover:brightness-[1.07]",
  outline: "border border-line bg-surface text-ink hover:border-brand-300",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100",
};

const SIZES = {
  sm: "h-8 px-3.5 text-xs",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-[15px]",
  icon: "h-10 w-10",
  iconSm: "h-8 w-8",
};

export default function Button({
  as: Comp = "button",
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}) {
  // Only native buttons get type/disabled; `as={Link}` renders a single focusable link.
  const nativeProps = Comp === "button" ? { type, disabled: disabled || loading } : {};
  return (
    <Comp
      {...nativeProps}
      className={cn(
        "focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap",
        "transition-all duration-200 ease-[var(--ease-spring)] active:scale-[0.97]",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </Comp>
  );
}
