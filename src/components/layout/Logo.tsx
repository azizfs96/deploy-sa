import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/dashboard"
      className={cn("flex items-center gap-2 font-semibold", className)}
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-fg shadow-[0_0_20px_rgba(99,102,241,0.45)]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L3 19h18L12 2z" fill="currentColor" />
        </svg>
      </span>
      {!collapsed && (
        <span className="text-[15px] tracking-tight">
          Deploy<span className="text-primary">.sa</span>
        </span>
      )}
    </Link>
  );
}
