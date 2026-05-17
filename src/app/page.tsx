import type { Route } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { workflows } from "@/lib/workflows";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      {/* Top edge — thick rule with serif wordmark */}
      <div className="border-b-2 border-ink">
        <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-6 py-3 md:px-10">
          <span aria-hidden className="block size-1.5 bg-accent" />
          <span className="font-display text-lg italic font-medium leading-none tracking-tight text-ink md:text-xl">
            Personal Health Clinic
            <span className="mx-2 not-italic text-ink-faint">·</span>
            <span className="text-ink-soft">AI Assistant</span>
          </span>
        </div>
      </div>

      {/* Sheet meta band — index numerals & date */}
      <div className="border-b border-ink">
        <div className="mx-auto flex w-full max-w-[1600px] items-stretch divide-x divide-ink px-0">
          <div className="flex-1 px-6 py-3 md:px-10">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
              Sheet
            </span>
            <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink tabular-nums">
              00 / 01
            </span>
          </div>
          <div className="hidden px-6 py-3 md:block md:px-10">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
              Issue
            </span>
            <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink tabular-nums">
              2026 — 05 — 17
            </span>
          </div>
          <div className="hidden px-6 py-3 md:block md:px-10">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
              Modules
            </span>
            <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink tabular-nums">
              {workflows.length.toString().padStart(2, "0")}
            </span>
          </div>
          <div className="ml-auto hidden px-6 py-3 md:block md:px-10">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
              Not for diagnosis
            </span>
          </div>
        </div>
      </div>

      {/* Hero block */}
      <section className="border-b-2 border-ink">
        <div className="mx-auto grid w-full max-w-[1600px] grid-cols-12 gap-x-6 px-6 py-12 md:gap-x-8 md:px-10 md:py-16">
          {/* Massive numeral anchor */}
          <div className="col-span-12 md:col-span-4 lg:col-span-3">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                Index № 00
              </span>
              <span
                aria-hidden
                className="-mt-3 font-display text-[14rem] font-light leading-[0.82] tracking-[-0.04em] text-ink md:text-[18rem] lg:text-[22rem]"
              >
                00
              </span>
              <span className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
                Cover · Manifest
              </span>
            </div>
          </div>

          {/* Stacked display wordmark */}
          <div className="col-span-12 mt-10 md:col-span-8 md:mt-0 lg:col-span-9">
            <div className="flex h-full flex-col justify-between">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                  Edition · 0001
                </span>

                <h1 className="mt-3 font-display font-light leading-[0.86] tracking-[-0.045em] text-ink">
                  <span className="block text-[5.5rem] md:text-[8rem] lg:text-[11rem]">
                    Personal
                  </span>
                  <span className="block text-[5.5rem] md:text-[8rem] lg:text-[11rem]">
                    Health
                  </span>
                  <span className="block text-[5.5rem] md:text-[8rem] lg:text-[11rem]">
                    Clinic<span className="text-accent">.</span>
                  </span>
                </h1>
              </div>

              <div className="mt-10 grid grid-cols-12 gap-x-6 border-t border-ink pt-6">
                <p className="col-span-12 max-w-[60ch] font-sans text-base leading-[1.55] text-ink md:col-span-8 md:text-lg">
                  A patient-facing reading room for medical text, audio,
                  and images. Six small open-weight models, one quiet
                  paper-and-ink interface. Built as a portfolio study in
                  clinical typography.
                </p>
                <div className="col-span-12 mt-6 flex flex-col gap-1 md:col-span-4 md:mt-0 md:items-end md:text-right">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
                    Filed under
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink">
                    Medgemma
                    <span className="mx-1.5 text-ink-faint">·</span>
                    MedSigLIP
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink">
                    CXR
                    <span className="mx-1.5 text-ink-faint">·</span>
                    Derm
                    <span className="mx-1.5 text-ink-faint">·</span>
                    Path
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow manifest */}
      <section className="border-b-2 border-ink">
        <div className="mx-auto w-full max-w-[1600px] px-6 md:px-10">
          {/* Section label band */}
          <div className="grid grid-cols-12 gap-x-6 border-b border-ink py-4 md:gap-x-8">
            <div className="col-span-12 flex items-center justify-between md:col-span-12">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink">
                § Manifest
                <span className="ml-3 text-ink-faint">
                  Six modules · open weights
                </span>
              </span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint md:block">
                Order
                <span className="mx-3">·</span>
                Module
                <span className="mx-3">·</span>
                Brief
                <span className="mx-3">·</span>
                Model
              </span>
            </div>
          </div>

          {/* Rows */}
          <ol className="divide-y divide-ink">
            {workflows.map((w) => {
              const Icon = w.icon;
              return (
                <li key={w.route}>
                  <Link
                    href={`/${w.route}` as Route}
                    prefetch
                    className="group grid grid-cols-12 items-baseline gap-x-6 py-6 transition-colors hover:bg-paper-soft md:gap-x-8 md:py-7"
                  >
                    {/* Order */}
                    <div className="col-span-2 md:col-span-1">
                      <span className="font-mono text-2xl tabular-nums text-ink md:text-3xl">
                        {w.order}
                      </span>
                    </div>

                    {/* Short label + icon */}
                    <div className="col-span-10 md:col-span-3">
                      <div className="flex items-center gap-3">
                        <Icon
                          aria-hidden
                          className="size-4 text-ink-soft group-hover:text-accent"
                          strokeWidth={1.5}
                        />
                        <span className="font-sans text-lg font-bold uppercase tracking-[0.04em] text-ink md:text-xl">
                          {w.shortLabel}
                        </span>
                      </div>
                      <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
                        {w.label}
                      </span>
                    </div>

                    {/* Help / brief */}
                    <div className="col-span-12 mt-3 md:col-span-5 md:mt-0">
                      <p className="max-w-[52ch] font-sans text-sm leading-[1.55] text-ink-soft md:text-base">
                        {w.help}
                      </p>
                    </div>

                    {/* Model badge + arrow */}
                    <div className="col-span-12 mt-3 flex items-center justify-between md:col-span-3 md:mt-0 md:justify-end md:gap-6">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                        {w.model}
                      </span>
                      <ArrowRight
                        aria-hidden
                        className="size-4 text-ink-soft transition-transform group-hover:translate-x-1 group-hover:text-accent"
                        strokeWidth={1.5}
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Enter CTA */}
      <section className="border-b-2 border-ink">
        <div className="mx-auto w-full max-w-[1600px] px-6 py-10 md:px-10 md:py-14">
          <div className="grid grid-cols-12 gap-x-6 gap-y-6 md:gap-x-8">
            <div className="col-span-12 md:col-span-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                Begin · Step 01
              </span>
              <p className="mt-3 max-w-[40ch] font-display text-2xl font-light leading-[1.15] tracking-[-0.01em] text-ink md:text-3xl">
                Start with plain-language visit notes.
                <span className="text-ink-faint">
                  {" "}
                  Switch modules from the header.
                </span>
              </p>
            </div>

            <div className="col-span-12 md:col-span-8">
              <Link
                href={"/chat" as Route}
                prefetch
                className="group flex w-full items-stretch border-2 border-ink bg-paper text-ink transition-colors hover:bg-ink hover:text-paper"
              >
                <span
                  aria-hidden
                  className="flex w-20 items-center justify-center border-r-2 border-ink bg-accent font-mono text-xs uppercase tracking-[0.22em] text-paper transition-colors group-hover:bg-paper group-hover:text-accent md:w-28"
                >
                  [ 01 ]
                </span>
                <span className="flex flex-1 items-center justify-between px-6 py-6 md:px-10 md:py-8">
                  <span className="flex flex-col">
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft group-hover:text-paper/70">
                      Enter
                    </span>
                    <span className="mt-1 font-sans text-3xl font-bold uppercase tracking-[-0.01em] md:text-5xl">
                      PHC<span className="text-accent group-hover:text-accent">—</span>AI
                    </span>
                  </span>
                  <span className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.22em]">
                    <span className="hidden md:inline">Open visit notes</span>
                    <ArrowRight
                      aria-hidden
                      className="size-6 transition-transform group-hover:translate-x-2 md:size-8"
                      strokeWidth={1.5}
                    />
                  </span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footnotes */}
      <section className="flex-1 border-b-2 border-ink">
        <div className="mx-auto grid w-full max-w-[1600px] grid-cols-12 gap-x-6 px-6 py-10 md:gap-x-8 md:px-10 md:py-12">
          <div className="col-span-12 md:col-span-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
              Colophon
            </span>
            <p className="mt-3 max-w-[40ch] font-sans text-sm leading-[1.6] text-ink-soft">
              Set in Geist Sans, Geist Mono, and Fraunces. Composed on a
              twelve-column grid with hairline rules at 1px and frames at
              2px. Single accent: burnt amber.
            </p>
          </div>
          <div className="col-span-12 mt-8 md:col-span-4 md:mt-0">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
              Disclaimer
            </span>
            <p className="mt-3 max-w-[40ch] font-sans text-sm leading-[1.6] text-ink-soft">
              PHC—AI is a portfolio prototype. Output is informational
              only and is{" "}
              <span className="text-accent">not a diagnosis</span>. Verify
              every claim with a licensed clinician.
            </p>
          </div>
          <div className="col-span-12 mt-8 md:col-span-4 md:mt-0">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
              Stack
            </span>
            <p className="mt-3 max-w-[40ch] font-sans text-sm leading-[1.6] text-ink-soft">
              Next.js 16 App Router · React 19 · Tailwind 4 · shadcn/ui.
              Inference served on Modal with open-weight medical models.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom edge — thick rule footer */}
      <footer className="border-t-0">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-6 py-4 md:px-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
            Not for diagnosis
            <span className="mx-2 text-ink-faint">·</span>
            Personal health clinic AI
            <span className="mx-2 text-ink-faint">·</span>
            v0.1
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint tabular-nums">
            № 0001 / build 2026.05
          </span>
        </div>
      </footer>
    </div>
  );
}
