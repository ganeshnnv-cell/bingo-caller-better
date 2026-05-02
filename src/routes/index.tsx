import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  component: BingoCaller,
});

const TOTAL = 90;
const ALL_NUMBERS = Array.from({ length: TOTAL }, (_, i) => i + 1);

const WIN_CATEGORIES = [
  { key: "first5", label: "First 5" },
  { key: "row1", label: "Row 1" },
  { key: "row2", label: "Row 2" },
  { key: "row3", label: "Row 3" },
  { key: "fullHouse", label: "Full House" },
] as const;

type WinKey = (typeof WIN_CATEGORIES)[number]["key"];

type Player = {
  id: string;
  name: string;
  wins: Record<WinKey, boolean>;
};

const emptyWins = (): Record<WinKey, boolean> => ({
  first5: false,
  row1: false,
  row2: false,
  row3: false,
  fullHouse: false,
});

function BingoCaller() {
  const [called, setCalled] = useState<number[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [drawKey, setDrawKey] = useState(0);

  const remaining = useMemo(
    () => ALL_NUMBERS.filter((n) => !called.includes(n)),
    [called],
  );

  const drawNext = useCallback(() => {
    if (remaining.length === 0) return;
    const next = remaining[Math.floor(Math.random() * remaining.length)];
    setCurrent(next);
    setCalled((prev) => [next, ...prev]);
    setDrawKey((k) => k + 1);
  }, [remaining]);

  const reset = useCallback(() => {
    setCalled([]);
    setCurrent(null);
    setDrawKey(0);
  }, []);

  const isCurrent = (n: number) => n === current;
  const isCalled = (n: number) => called.includes(n) && n !== current;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <header className="mb-8 flex flex-col items-center gap-2 text-center">
        <span className="text-xs uppercase tracking-[0.4em] text-primary/80">
          Live Caller
        </span>
        <h1 className="font-display text-5xl tracking-wide md:text-7xl">
          Bingo <span className="text-primary">Night</span>
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Draw a number from 1 to 90. Watch it light up the board, then get
          crossed off as the night rolls on.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_2fr_1fr]">
        {/* Left: Current ball + controls */}
        <section className="flex flex-col items-center gap-6">
          <div className="rounded-3xl border border-border bg-card/60 p-6 backdrop-blur-sm w-full flex flex-col items-center">
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Current call
            </span>
            <div className="my-6 flex h-48 w-48 items-center justify-center">
              {current === null ? (
                <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground">
                  <span className="text-sm">Press DRAW</span>
                </div>
              ) : (
                <div
                  key={drawKey}
                  className="animate-ball-drop animate-pulse-glow flex h-44 w-44 items-center justify-center rounded-full font-display text-7xl text-current-foreground"
                  style={{
                    background: "var(--gradient-ball)",
                    boxShadow: "var(--shadow-ball)",
                  }}
                >
                  {current}
                </div>
              )}
            </div>

            <button
              onClick={drawNext}
              disabled={remaining.length === 0}
              className="group relative w-full overflow-hidden rounded-2xl px-6 py-5 font-display text-2xl tracking-wider text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: "var(--gradient-cta)",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              {remaining.length === 0 ? "All called" : "Draw Number"}
            </button>

            <div className="mt-4 flex w-full items-center justify-between text-sm text-muted-foreground">
              <span>
                Called{" "}
                <span className="font-semibold text-foreground">
                  {called.length}
                </span>
                /{TOTAL}
              </span>
              <button
                onClick={reset}
                className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wider transition-colors hover:bg-secondary"
              >
                Reset
              </button>
            </div>
          </div>
        </section>

        {/* Middle: Grid 1–90 */}
        <section className="rounded-3xl border border-border bg-card/40 p-4 md:p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl tracking-wider">Board</h2>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <LegendDot label="Open" className="bg-secondary" />
              <LegendDot label="Current" className="bg-primary" />
              <LegendDot label="Called" className="bg-called" />
            </div>
          </div>
          <div className="grid grid-cols-10 gap-1.5 md:gap-2">
            {ALL_NUMBERS.map((n) => {
              const current = isCurrent(n);
              const calledOut = isCalled(n);
              return (
                <div
                  key={n}
                  className={[
                    "relative aspect-square flex items-center justify-center rounded-lg font-display text-lg md:text-xl transition-all duration-300 select-none",
                    current
                      ? "bg-primary text-primary-foreground scale-110 shadow-[var(--shadow-glow)] z-10"
                      : calledOut
                        ? "bg-called text-called-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
                  ].join(" ")}
                >
                  <span className={calledOut ? "opacity-70" : ""}>{n}</span>
                  {calledOut && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-2 block"
                      style={{
                        background:
                          "linear-gradient(135deg, transparent 45%, oklch(0.98 0 0 / 0.9) 47%, oklch(0.98 0 0 / 0.9) 53%, transparent 55%)",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Right: Call history */}
        <section className="rounded-3xl border border-border bg-card/60 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl tracking-wider">History</h2>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Newest first
            </span>
          </div>
          {called.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No numbers called yet.
            </p>
          ) : (
            <ol className="flex flex-wrap gap-2">
              {called.map((n, i) => (
                <li
                  key={`${n}-${i}`}
                  className={[
                    "flex h-10 w-10 items-center justify-center rounded-full font-display text-base",
                    i === 0
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/40"
                      : "bg-secondary text-secondary-foreground",
                  ].join(" ")}
                  title={i === 0 ? "Latest call" : `Call #${called.length - i}`}
                >
                  {n}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}

function LegendDot({ label, className }: { label: string; className: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}
