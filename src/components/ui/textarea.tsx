import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-36 w-full resize-y rounded-none border border-[#cfd8dd] bg-white px-3 py-2 text-sm text-[#18202a] outline-none transition-colors placeholder:text-[#7b8a97] focus:border-[#126b5d] focus:ring-2 focus:ring-[#126b5d]/15",
        className,
      )}
      {...props}
    />
  );
}
