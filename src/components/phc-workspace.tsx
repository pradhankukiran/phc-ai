"use client";

import type { Route } from "next";
import { HeartPulse, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ChatWorkflow } from "./chat-workflow";
import { MediaWorkflow } from "./media-workflow";
import { cn } from "@/lib/utils";
import {
  getWorkflow,
  workflows,
  type WorkflowRoute,
} from "@/lib/workflows";

export function PhcWorkspace({ activeRoute }: { activeRoute: WorkflowRoute }) {
  const workflow = useMemo(() => {
    const found = getWorkflow(activeRoute);
    if (!found) throw new Error(`Unknown workflow route: ${activeRoute}`);
    return found;
  }, [activeRoute]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header activeRoute={activeRoute} />
      <main className="flex-1 overflow-hidden">
        {workflow.task === "chat" ? (
          <ChatWorkflow workflow={workflow} />
        ) : (
          <MediaWorkflow workflow={workflow} />
        )}
      </main>
    </div>
  );
}

function Header({ activeRoute }: { activeRoute: WorkflowRoute }) {
  return (
    <header className="sticky top-0 z-40 flex h-[var(--header-height)] flex-shrink-0 items-center gap-6 border-b border-border/70 bg-background/85 px-4 backdrop-blur-md md:px-6">
      <Link
        href={"/chat" as Route}
        className="flex items-center gap-2 font-semibold tracking-tight text-foreground"
      >
        <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <HeartPulse className="size-4" />
        </span>
        <span className="text-sm">PHC-AI</span>
      </Link>

      <nav
        aria-label="Workflows"
        className="-mx-1 flex flex-1 items-center gap-0.5 overflow-x-auto"
      >
        {workflows.map((w) => {
          const Icon = w.icon;
          const active = w.route === activeRoute;
          return (
            <Link
              key={w.route}
              href={`/${w.route}` as Route}
              prefetch
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {w.shortLabel}
            </Link>
          );
        })}
      </nav>

      <div className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
        <ShieldAlert className="size-3.5" />
        Not for diagnosis
      </div>
    </header>
  );
}
