import { Framework } from "@/lib/types";
import { cn } from "@/lib/utils";

const map: Record<Framework, { label: string; bg: string; initials: string }> = {
  node: { label: "Node.js", bg: "bg-[#3C873A]", initials: "JS" },
  python: { label: "Python", bg: "bg-[#3572A5]", initials: "PY" },
  static: { label: "Static", bg: "bg-[#8B5CF6]", initials: "ST" },
};

export function FrameworkIcon({
  framework,
  size = "md",
  className,
}: {
  framework: Framework;
  size?: "sm" | "md";
  className?: string;
}) {
  const f = map[framework];
  return (
    <span
      title={f.label}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-mono font-bold text-white",
        f.bg,
        size === "sm" ? "h-6 w-6 text-[10px]" : "h-9 w-9 text-xs",
        className
      )}
    >
      {f.initials}
    </span>
  );
}

export const frameworkLabel = (f: Framework) => map[f].label;
