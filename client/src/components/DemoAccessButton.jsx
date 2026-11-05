import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import Button from "./ui/Button";

function demoHref() {
  const id = typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `/demo?session=${encodeURIComponent(id)}`;
}

export default function DemoAccessButton({ className }) {
  return (
    <Button
      as={Link}
      to={demoHref()}
      variant="outline"
      className={`!flex rounded-xl !border-[#16161d] !bg-[#16161d] font-bold !text-white shadow-[var(--shadow-card)] hover:!border-black hover:!bg-black ${className || ""}`}
    >
      <Sparkles className="h-4 w-4" />
      Try as a Demo User
    </Button>
  );
}
