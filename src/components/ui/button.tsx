import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-[#126b5d] text-white hover:bg-[#0f5c50]",
        variant === "secondary" &&
          "border border-[#cfd8dd] bg-white text-[#22313f] hover:bg-[#edf3f6]",
        variant === "ghost" && "text-[#425466] hover:bg-[#edf3f6]",
        className,
      )}
      {...props}
    />
  );
}
