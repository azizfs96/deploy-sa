/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

export function Avatar({
  src,
  alt,
  size = 28,
  className,
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded-full border border-border object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
