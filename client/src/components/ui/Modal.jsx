import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

const SIZES = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
};

const spring = { type: "spring", stiffness: 420, damping: 34 };

export default function Modal({ open, onClose, title, description, children, footer, size = "md" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <motion.div
            className="absolute inset-0 bg-ink/35 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn("card relative w-full rounded-3xl p-6 shadow-[var(--shadow-lift)]", SIZES[size])}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={spring}
          >
            {(title || onClose) && (
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  {title && <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>}
                  {description && <p className="mt-1 text-sm text-muted">{description}</p>}
                </div>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            {children}
            {footer && <div className="mt-6 flex items-center justify-end gap-2">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
