import { cn, colorFromId, initials } from "../../lib/utils";

const SIZES = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
};

export default function Avatar({ user, size = "md", ring = false, className }) {
  const name = user?.name || user?.email || "";
  const seed = user?.id || user?.email || user?.name;
  return (
    <div
      title={name}
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full font-bold text-white shadow-[var(--shadow-card)] no-select",
        SIZES[size],
        ring && "ring-2 ring-surface",
        className,
      )}
      style={{ backgroundColor: colorFromId(seed) }}
    >
      {user?.avatar_url ? (
        <img src={user.avatar_url} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </div>
  );
}
