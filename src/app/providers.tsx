"use client";

import { MantineProvider, createTheme } from "@mantine/core";

const theme = createTheme({
  primaryColor: "teal",
  defaultRadius: 0,
  fontFamily: "var(--font-geist-sans), Arial, sans-serif",
  headings: {
    fontFamily: "var(--font-geist-sans), Arial, sans-serif",
    fontWeight: "700",
  },
  respectReducedMotion: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  return <MantineProvider theme={theme}>{children}</MantineProvider>;
}
