import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import Button from "./ui/Button";

function demoHref() {
  const id = typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `/demo?session=${encodeURIComponent(id)}`;
}

export default function DemoAccessButton({ className }) {
  return (
    <Button as={Link} to={demoHref()} variant="soft" className={className}>
      <Sparkles className="h-4 w-4" />
      Try as a Demo User
    </Button>
  );
}
