"use client";

import { Box, Container, Group, Text } from "@mantine/core";
import type { Route } from "next";
import { HeartPulse, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ChatWorkflow } from "./chat-workflow";
import { MediaWorkflow } from "./media-workflow";
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
    <Box style={{ minHeight: "100vh", background: "var(--phc-bg)" }}>
      <Header activeRoute={activeRoute} />
      {workflow.task === "chat" ? (
        <ChatWorkflow workflow={workflow} />
      ) : (
        <MediaWorkflow workflow={workflow} />
      )}
    </Box>
  );
}

function Header({ activeRoute }: { activeRoute: WorkflowRoute }) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        height: "var(--phc-header-height)",
        background: "var(--phc-surface)",
        borderBottom: "1px solid var(--phc-border)",
      }}
    >
      <Container
        size="xl"
        h="100%"
        style={{ display: "flex", alignItems: "center", gap: 24 }}
      >
        <Link
          href={"/chat" as Route}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            color: "var(--phc-text-strong)",
          }}
        >
          <HeartPulse size={20} color="var(--phc-accent)" />
          <Text fw={800} size="md" c="var(--phc-text-strong)">
            PHC-AI
          </Text>
        </Link>
        <nav
          aria-label="Workflows"
          style={{
            display: "flex",
            gap: 2,
            flex: 1,
            overflowX: "auto",
          }}
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
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 14px",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: active ? "var(--phc-accent)" : "var(--phc-text-muted)",
                  borderBottom: active
                    ? "2px solid var(--phc-accent)"
                    : "2px solid transparent",
                  whiteSpace: "nowrap",
                  transition: "color 120ms ease, border-color 120ms ease",
                }}
              >
                <Icon size={14} />
                {w.shortLabel}
              </Link>
            );
          })}
        </nav>
        <Group gap={6} visibleFrom="md">
          <ShieldAlert size={14} color="var(--phc-text-muted)" />
          <Text size="xs" c="var(--phc-text-muted)">
            Not for diagnosis
          </Text>
        </Group>
      </Container>
    </header>
  );
}
