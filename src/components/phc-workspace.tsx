"use client";

import type { Route } from "next";
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
    <div className="flex h-screen flex-col bg-paper text-ink">
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
    <header className="sticky top-0 z-40 flex h-[var(--header-height)] flex-shrink-0 items-stretch border-b border-ink bg-paper">
      <Link
        href={"/" as Route}
        className="flex items-center border-r border-ink px-5 hover:bg-ink hover:text-paper transition-colors"
      >
        <span className="font-display text-2xl italic font-medium leading-none tracking-tight">
          Phc<span className="text-accent">—</span>Ai
        </span>
      </Link>

      <nav
        aria-label="Workflows"
        className="flex flex-1 items-stretch overflow-x-auto"
      >
        {workflows.map((w) => {
          const active = w.route === activeRoute;
          return (
            <Link
              key={w.route}
              href={`/${w.route}` as Route}
              prefetch
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-2 whitespace-nowrap border-r border-ink px-4 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
                active
                  ? "bg-ink text-paper"
                  : "text-ink-soft hover:bg-paper-soft hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "font-mono tabular-nums",
                  active ? "text-accent" : "text-ink-faint",
                )}
              >
                {w.order}
              </span>
              <span className="font-sans text-xs font-semibold uppercase tracking-[0.16em]">
                {w.shortLabel}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto hidden items-center gap-3 border-l border-ink px-5 md:flex">
        <span
          aria-hidden
          className="block size-1.5 rounded-full bg-accent"
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
          Not for diagnosis
        </span>
      </div>
    </header>
  );
}
