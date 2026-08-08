"use client";

import { useEffect, useState } from "react";

type Feeling = "great" | "good" | "okay" | "tough";

type Run = {
  id: string;
  date: string; // YYYY-MM-DD
  distance: number; // miles
  duration: number; // minutes
  feeling: Feeling;
  notes: string;
};

const STORAGE_KEY = "running-journal-runs";

const FEELING_EMOJI: Record<Feeling, string> = {
  great: "😃",
  good: "🙂",
  okay: "😐",
  tough: "😩",
};

const FEELING_LABEL: Record<Feeling, string> = {
  great: "Great",
  good: "Good",
  okay: "Okay",
  tough: "Tough",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatPace(distance: number, duration: number) {
  if (!distance) return "–";
  const paceMinutes = duration / distance;
  const min = Math.floor(paceMinutes);
  const sec = Math.round((paceMinutes - min) * 60);
  return `${min}:${sec.toString().padStart(2, "0")} /mi`;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function computeStreak(runs: Run[]) {
  if (runs.length === 0) return 0;
  const dates = new Set(runs.map((r) => r.date));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // Allow the streak to count today OR yesterday as the most recent anchor,
  // so a still-open "haven't run yet today" day doesn't zero out the streak.
  const cursorISO = () => cursor.toISOString().slice(0, 10);
  if (!dates.has(cursorISO())) {
    cursor.setDate(cursor.getDate() - 1);
    if (!dates.has(cursorISO())) return 0;
  }

  while (dates.has(cursorISO())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function RunningJournal() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [date, setDate] = useState(todayISO());
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [feeling, setFeeling] = useState<Feeling>("good");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setRuns(JSON.parse(raw));
    } catch {
      // ignore corrupt storage
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  }, [runs, loaded]);

  function addRun(e: React.FormEvent) {
    e.preventDefault();
    const dist = parseFloat(distance);
    const dur = parseFloat(duration);
    if (!date || !dist || !dur) return;

    const run: Run = {
      id: crypto.randomUUID(),
      date,
      distance: dist,
      duration: dur,
      feeling,
      notes: notes.trim(),
    };

    setRuns((prev) =>
      [...prev, run].sort((a, b) => (a.date < b.date ? 1 : -1))
    );
    setDistance("");
    setDuration("");
    setNotes("");
    setFeeling("good");
    setDate(todayISO());
  }

  function deleteRun(id: string) {
    setRuns((prev) => prev.filter((r) => r.id !== id));
  }

  const totalRuns = runs.length;
  const totalMiles = runs.reduce((sum, r) => sum + r.distance, 0);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoISO = weekAgo.toISOString().slice(0, 10);
  const weekMiles = runs
    .filter((r) => r.date >= weekAgoISO)
    .reduce((sum, r) => sum + r.distance, 0);

  const streak = computeStreak(runs);

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-2xl flex-col gap-10 py-16 px-6 sm:px-10">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Running Journal
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Log your runs and keep track of your habit.
          </p>
        </header>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total runs", value: totalRuns },
            { label: "Total miles", value: totalMiles.toFixed(1) },
            { label: "This week", value: `${weekMiles.toFixed(1)} mi` },
            { label: "Streak", value: `${streak} 🔥` },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col gap-1 rounded-xl border border-black/[.08] bg-white px-4 py-3 dark:border-white/[.145] dark:bg-zinc-950"
            >
              <span className="text-xs uppercase tracking-wide text-zinc-500">
                {stat.label}
              </span>
              <span className="text-xl font-semibold text-black dark:text-zinc-50">
                {stat.value}
              </span>
            </div>
          ))}
        </section>

        <form
          onSubmit={addRun}
          className="flex flex-col gap-4 rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-950"
        >
          <h2 className="text-lg font-medium text-black dark:text-zinc-50">
            Log a run
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={todayISO()}
                required
                className="rounded-md border border-black/[.08] bg-transparent px-2 py-1.5 text-black dark:border-white/[.145] dark:text-zinc-50"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
              Distance (mi)
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="3.1"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                required
                className="rounded-md border border-black/[.08] bg-transparent px-2 py-1.5 text-black dark:border-white/[.145] dark:text-zinc-50"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
              Duration (min)
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                placeholder="28"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
                className="rounded-md border border-black/[.08] bg-transparent px-2 py-1.5 text-black dark:border-white/[.145] dark:text-zinc-50"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
              Feeling
              <select
                value={feeling}
                onChange={(e) => setFeeling(e.target.value as Feeling)}
                className="rounded-md border border-black/[.08] bg-transparent px-2 py-1.5 text-black dark:border-white/[.145] dark:text-zinc-50"
              >
                {(Object.keys(FEELING_LABEL) as Feeling[]).map((f) => (
                  <option key={f} value={f}>
                    {FEELING_EMOJI[f]} {FEELING_LABEL[f]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Legs felt heavy, humid morning..."
              rows={2}
              className="rounded-md border border-black/[.08] bg-transparent px-2 py-1.5 text-black dark:border-white/[.145] dark:text-zinc-50"
            />
          </label>
          <button
            type="submit"
            className="self-start rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Add run
          </button>
        </form>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-black dark:text-zinc-50">
            History
          </h2>
          {runs.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No runs logged yet — add your first one above.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {runs.map((run) => (
                <li
                  key={run.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-black/[.08] bg-white px-4 py-3 dark:border-white/[.145] dark:bg-zinc-950"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-black dark:text-zinc-50">
                      <span>{formatDate(run.date)}</span>
                      <span aria-label={FEELING_LABEL[run.feeling]}>
                        {FEELING_EMOJI[run.feeling]}
                      </span>
                    </div>
                    <div className="text-sm text-zinc-500">
                      {run.distance} mi · {run.duration} min ·{" "}
                      {formatPace(run.distance, run.duration)}
                    </div>
                    {run.notes && (
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        {run.notes}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteRun(run.id)}
                    aria-label="Delete run"
                    className="text-zinc-400 transition-colors hover:text-red-500"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
