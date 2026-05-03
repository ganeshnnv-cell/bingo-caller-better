import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  buyIn: number;
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
  const [players, setPlayers] = useState<Player[]>([]);
  const [newName, setNewName] = useState("");
  const [prizes, setPrizes] = useState<Record<WinKey, number>>({
    first5: 0,
    row1: 0,
    row2: 0,
    row3: 0,
    fullHouse: 0,
  });
  const [gameEnded, setGameEnded] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"reset" | "end" | null>(null);
  const [autoInterval, setAutoInterval] = useState<5 | 10>(5);
  const [autoPlaying, setAutoPlaying] = useState(false);

  const speakNumber = useCallback((n: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(`Number ${n}`);
      u.rate = 0.9;
      u.pitch = 1;
      u.volume = 1;
      window.speechSynthesis.speak(u);
    } catch {
      // ignore
    }
  }, []);

  const addPlayer = useCallback(() => {
    const name = newName.trim();
    if (!name) return;
    setPlayers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, buyIn: 0, wins: emptyWins() },
    ]);
    setNewName("");
  }, [newName]);

  const removePlayer = useCallback((id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const toggleWin = useCallback((id: string, key: WinKey) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, wins: { ...p.wins, [key]: !p.wins[key] } } : p,
      ),
    );
  }, []);

  const setBuyIn = useCallback((id: string, value: number) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, buyIn: Number.isFinite(value) && value >= 0 ? value : 0 }
          : p,
      ),
    );
  }, []);

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
    speakNumber(next);
  }, [remaining, speakNumber]);

  const reset = useCallback(() => {
    setCalled([]);
    setCurrent(null);
    setDrawKey(0);
    setGameEnded(false);
    setPlayers((prev) => prev.map((p) => ({ ...p, wins: emptyWins() })));
  }, []);

  const endGame = useCallback(() => {
    setGameEnded(true);
  }, []);

  const setPrize = useCallback((key: WinKey, value: number) => {
    setPrizes((prev) => ({ ...prev, [key]: Number.isFinite(value) ? value : 0 }));
  }, []);

  const playerTotals = useMemo(
    () =>
      players.map((p) => {
        const winnings = WIN_CATEGORIES.reduce(
          (sum, c) => sum + (p.wins[c.key] ? prizes[c.key] : 0),
          0,
        );
        const net = winnings - p.buyIn;
        return { ...p, winnings, net };
      }),
    [players, prizes],
  );

  const totals = useMemo(
    () => ({
      pot: players.reduce((s, p) => s + p.buyIn, 0),
      paidOut: playerTotals.reduce((s, p) => s + p.winnings, 0),
    }),
    [players, playerTotals],
  );

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
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmAction("end")}
                  disabled={gameEnded || called.length === 0}
                  className="rounded-full border border-primary/60 px-3 py-1 text-xs uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  End game
                </button>
                <button
                  onClick={() => setConfirmAction("reset")}
                  className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wider transition-colors hover:bg-secondary"
                >
                  Reset
                </button>
              </div>
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

      {/* Prizes per category */}
      <section className="mt-10 rounded-3xl border border-border bg-card/60 p-6 backdrop-blur-sm">
        <div className="mb-4">
          <h2 className="font-display text-2xl tracking-wider">Prizes</h2>
          <p className="text-xs text-muted-foreground">
            Set a prize amount for each winning category.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {WIN_CATEGORIES.map((c) => (
            <label key={c.key} className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {c.label}
              </span>
              <div className="flex items-center rounded-lg border border-border bg-background/40 px-3">
                <span className="text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={prizes[c.key] || ""}
                  onChange={(e) => setPrize(c.key, parseFloat(e.target.value))}
                  placeholder="0"
                  className="w-full bg-transparent px-2 py-2 text-sm outline-none"
                />
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Players & winners */}
      <section className="mt-10 rounded-3xl border border-border bg-card/60 p-6 backdrop-blur-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-2xl tracking-wider">Players</h2>
            <p className="text-xs text-muted-foreground">
              Tick a category when a player calls a win.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addPlayer();
            }}
            className="flex w-full gap-2 md:w-auto"
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Add player name"
              className="flex-1 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm outline-none focus:border-primary md:w-64"
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Add
            </button>
          </form>
        </div>

        {players.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No players yet. Add one above to start tracking winners.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Player</th>
                  <th className="px-2 py-2">Buy-in</th>
                  {WIN_CATEGORIES.map((c) => (
                    <th key={c.key} className="px-2 py-2 text-center">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id} className="bg-secondary/40">
                    <td className="rounded-l-lg px-3 py-2 font-display text-lg tracking-wide">
                      {p.name}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center rounded-md border border-border bg-background/40 px-2">
                        <span className="text-xs text-muted-foreground">$</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={p.buyIn || ""}
                          onChange={(e) =>
                            setBuyIn(p.id, parseFloat(e.target.value))
                          }
                          placeholder="0"
                          className="w-20 bg-transparent px-1 py-1.5 text-sm outline-none"
                        />
                      </div>
                    </td>
                    {WIN_CATEGORIES.map((c) => {
                      const won = p.wins[c.key];
                      return (
                        <td key={c.key} className="px-2 py-2 text-center">
                          <button
                            onClick={() => toggleWin(p.id, c.key)}
                            className={[
                              "h-9 w-full max-w-[110px] rounded-md border text-xs font-semibold uppercase tracking-wider transition-all",
                              won
                                ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                                : "border-border bg-background/30 text-muted-foreground hover:border-primary/60 hover:text-foreground",
                            ].join(" ")}
                          >
                            {won ? "✓ Won" : "Mark"}
                          </button>
                        </td>
                      );
                    })}
                    <td className="rounded-r-lg px-2 py-2 text-right">
                      <button
                        onClick={() => removePlayer(p.id)}
                        className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* End-of-game payout summary */}
      {gameEnded && (
        <section
          className="mt-10 rounded-3xl border-2 border-primary/60 p-6 backdrop-blur-sm"
          style={{ background: "var(--gradient-stage)" }}
        >
          <div className="mb-6 flex flex-col gap-1 text-center">
            <span className="text-xs uppercase tracking-[0.4em] text-primary">
              Game Over
            </span>
            <h2 className="font-display text-4xl tracking-wider">
              Final Payouts
            </h2>
            <p className="text-sm text-muted-foreground">
              Pot collected:{" "}
              <span className="font-semibold text-foreground">
                ${totals.pot.toFixed(2)}
              </span>{" "}
              · Paid out:{" "}
              <span className="font-semibold text-foreground">
                ${totals.paidOut.toFixed(2)}
              </span>
            </p>
          </div>

          {playerTotals.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              No players were added.
            </p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {playerTotals
                .slice()
                .sort((a, b) => b.net - a.net)
                .map((p) => {
                  const wonCats = WIN_CATEGORIES.filter((c) => p.wins[c.key]);
                  const owes = p.net < 0;
                  return (
                    <li
                      key={p.id}
                      className={[
                        "rounded-2xl border p-4",
                        p.net > 0
                          ? "border-primary/60 bg-primary/10"
                          : owes
                            ? "border-destructive/40 bg-destructive/10"
                            : "border-border bg-secondary/30",
                      ].join(" ")}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-display text-2xl tracking-wide">
                          {p.name}
                        </span>
                        <span
                          className={[
                            "font-display text-2xl",
                            p.net > 0
                              ? "text-primary"
                              : owes
                                ? "text-destructive"
                                : "text-foreground",
                          ].join(" ")}
                        >
                          {p.net >= 0 ? "+" : "−"}$
                          {Math.abs(p.net).toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                        <span>Buy-in: ${p.buyIn.toFixed(2)}</span>
                        <span>Won: ${p.winnings.toFixed(2)}</span>
                      </div>
                      <div className="mt-1 text-xs">
                        {owes ? (
                          <span className="text-destructive">
                            Owes ${Math.abs(p.net).toFixed(2)}
                          </span>
                        ) : p.net > 0 ? (
                          <span className="text-primary">
                            Receives ${p.net.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Breaks even
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {wonCats.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            No wins
                          </span>
                        ) : (
                          wonCats.map((c) => (
                            <span
                              key={c.key}
                              className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary"
                            >
                              {c.label} · ${prizes[c.key].toFixed(2)}
                            </span>
                          ))
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}

          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={reset}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Start new game
            </button>
          </div>
        </section>
      )}
      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "end" ? "End the game?" : "Reset the game?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "end"
                ? "This will lock in the current wins and show the final payouts."
                : "This will clear all called numbers and player wins. Player names and buy-ins will be kept."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction === "end") endGame();
                else if (confirmAction === "reset") reset();
                setConfirmAction(null);
              }}
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
