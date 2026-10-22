import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

const EMOJIS = [
  "😀", "😂", "😍", "🤔", "😎", "🥳", "😮", "😢",
  "👍", "👎", "👏", "🙌", "🙏", "💪", "👀", "🤝",
  "❤️", "🔥", "⭐", "✨", "💡", "🎯", "🚀", "🎉",
  "✅", "❌", "⚠️", "❓", "❗", "📌", "📎", "🔗",
  "📈", "📉", "📊", "🗓️", "⏰", "💬", "🧠", "🏆",
];

export default function EmojiPicker({ open, onClose, onPick }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      // The toolbar's emoji button toggles us itself.
      if (ref.current?.contains(e.target) || e.target.closest?.("[data-emoji-toggle]")) return;
      onClose();
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 480, damping: 34 }}
          className="card absolute bottom-20 left-1/2 z-40 w-[19rem] -translate-x-1/2 rounded-2xl p-2 shadow-[var(--shadow-lift)]"
        >
          <div className="grid grid-cols-8 gap-0.5">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onPick(emoji)}
                className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-xl transition-transform hover:scale-110 hover:bg-surface-2"
              >
                {emoji}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
