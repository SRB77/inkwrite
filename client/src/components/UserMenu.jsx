import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut } from "lucide-react";
import Avatar from "./ui/Avatar";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="focus-ring flex items-center gap-2.5 rounded-full py-1 pr-2 pl-1 transition-colors hover:bg-surface-2"
      >
        <Avatar user={user} size="md" />
        <span className="hidden text-left sm:block">
          <span className="block max-w-[12rem] truncate text-sm font-semibold text-ink">{user.name}</span>
          <span className="block max-w-[12rem] truncate text-xs text-muted">{user.email}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted transition-transform duration-200", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            className="card absolute top-12 right-0 z-30 w-64 origin-top-right rounded-2xl p-2 shadow-[var(--shadow-lift)]"
          >
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar user={user} size="md" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">{user.name}</div>
                <div className="truncate text-xs text-muted">{user.email}</div>
              </div>
            </div>
            <div className="my-1.5 h-px bg-line" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="focus-ring flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-danger"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
