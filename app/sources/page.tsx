import { supabase } from "@/lib/supabase";
import { formatRelativeTime } from "@/lib/format";

export const revalidate = 60;

type SourceRow = {
  id: string;
  display_name: string;
  source_type: string;
  base_confidence: number | null;
  homepage_url: string | null;
  notes: string | null;
};

type RunRow = {
  id: string;
  source_id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  items_attempted: number;
  items_ingested: number;
  items_dead_lettered: number;
  new_products_created: number;
};

async function fetchSources(): Promise<SourceRow[]> {
  const { data, error } = await supabase
    .from("sources")
    .select("id, display_name, source_type, base_confidence, homepage_url, notes")
    .order("base_confidence", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as SourceRow[];
}

async function fetchRecentRuns(): Promise<RunRow[]> {
  const { data, error } = await supabase
    .from("pipeline_runs")
    .select(
      "id, source_id, status, started_at, finished_at, items_attempted, items_ingested, items_dead_lettered, new_products_created",
    )
    .order("started_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  return (data ?? []) as RunRow[];
}

const STATUS_STYLE: Record<string, string> = {
  succeeded: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/10 text-red-400 border-red-500/30",
  partial: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  interrupted: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  running: "bg-sky-500/10 text-sky-400 border-sky-500/30",
};

const TYPE_STYLE: Record<string, string> = {
  official_stats: "bg-blue-500/10 text-blue-400",
  retailer_api: "bg-purple-500/10 text-purple-400",
  open_data: "bg-emerald-500/10 text-emerald-400",
  flyer_vlm: "bg-amber-500/10 text-amber-400",
  osm: "bg-sky-500/10 text-sky-400",
};

export default async function SourcesPage() {
  const [sources, runs] = await Promise.all([fetchSources(), fetchRecentRuns()]);

  // Roll up run stats per source.
  const runStats = new Map<
    string,
    { ingested: number; failed: number; succeeded: number; lastRun?: RunRow }
  >();
  for (const r of runs) {
    const acc =
      runStats.get(r.source_id) ?? {
        ingested: 0,
        failed: 0,
        succeeded: 0,
        lastRun: undefined as RunRow | undefined,
      };
    acc.ingested += r.items_ingested;
    if (r.status === "succeeded") acc.succeeded += 1;
    if (r.status === "failed") acc.failed += 1;
    if (!acc.lastRun || acc.lastRun.started_at < r.started_at) acc.lastRun = r;
    runStats.set(r.source_id, acc);
  }

  const succeededCount = runs.filter((r) => r.status === "succeeded").length;
  const failedCount = runs.filter((r) => r.status === "failed").length;

  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Pipeline sources</h1>
        <p className="mt-1.5 text-sm text-neutral-400 max-w-3xl">
          Each row is one source module under{" "}
          <code className="font-mono text-neutral-300">/sources</code> in the
          ingestion repo. Confidence is the source-level base; per-observation
          scores are composed from extraction confidence, recency, and
          (eventually) cross-source agreement.
        </p>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="recent runs" value={runs.length.toLocaleString()} />
        <Stat
          label="succeeded"
          value={succeededCount.toLocaleString()}
          accent="emerald"
        />
        <Stat
          label="failed"
          value={failedCount.toLocaleString()}
          accent={failedCount > 0 ? "red" : undefined}
        />
        <Stat
          label="sources tracked"
          value={sources.length.toLocaleString()}
        />
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-300 mb-3">
          Sources
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {sources.map((s) => {
            const stats = runStats.get(s.id);
            const lastRun = stats?.lastRun;
            return (
              <div
                key={s.id}
                className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-neutral-100">
                      {s.display_name}
                    </div>
                    <div className="mt-1 flex gap-2 items-center flex-wrap text-xs">
                      <code className="font-mono text-neutral-500">{s.id}</code>
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono text-[10px] uppercase tracking-wider ${
                          TYPE_STYLE[s.source_type] ??
                          "bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        {s.source_type}
                      </span>
                      {s.homepage_url ? (
                        <a
                          href={s.homepage_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-neutral-500 hover:text-neutral-300 underline"
                        >
                          site ↗
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <span className="font-mono tabular-nums text-sm text-emerald-400 shrink-0">
                    {s.base_confidence != null
                      ? s.base_confidence.toFixed(2)
                      : "—"}
                  </span>
                </div>
                {s.notes ? (
                  <p className="mt-2.5 text-xs text-neutral-500 leading-relaxed">
                    {s.notes}
                  </p>
                ) : null}
                {lastRun ? (
                  <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
                    <span className="text-neutral-500">
                      last run {formatRelativeTime(lastRun.started_at)} ·{" "}
                      <span className="font-mono">
                        {lastRun.items_ingested} ingested
                      </span>
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wider font-mono ${
                        STATUS_STYLE[lastRun.status] ??
                        "bg-neutral-800 border-neutral-700 text-neutral-400"
                      }`}
                    >
                      {lastRun.status}
                    </span>
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-neutral-800 text-xs text-neutral-600">
                    no runs in last 40 events
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-300 mb-3">
          Recent pipeline runs
        </h2>
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl overflow-hidden text-sm">
          <table className="w-full">
            <thead className="bg-neutral-900 text-[10px] uppercase tracking-widest text-neutral-500">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">started</th>
                <th className="text-left px-4 py-2.5 font-medium">source</th>
                <th className="text-left px-4 py-2.5 font-medium">status</th>
                <th className="text-right px-4 py-2.5 font-medium">ingested</th>
                <th className="text-right px-4 py-2.5 font-medium">dlq</th>
                <th className="text-right px-4 py-2.5 font-medium">new prods</th>
                <th className="text-right px-4 py-2.5 font-medium">duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {runs.map((r) => {
                const duration =
                  r.finished_at
                    ? Math.round(
                        (new Date(r.finished_at).getTime() -
                          new Date(r.started_at).getTime()) /
                          1000,
                      )
                    : null;
                return (
                  <tr key={r.id} className="hover:bg-neutral-900 transition-colors">
                    <td className="px-4 py-2 text-neutral-500 text-xs">
                      {formatRelativeTime(r.started_at)}
                    </td>
                    <td className="px-4 py-2 font-mono text-neutral-200">
                      {r.source_id}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] border font-mono uppercase tracking-wider ${
                          STATUS_STYLE[r.status] ??
                          "bg-neutral-800 border-neutral-700 text-neutral-400"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-mono">
                      {r.items_ingested.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-mono">
                      {r.items_dead_lettered > 0 ? (
                        <span className="text-red-400">
                          {r.items_dead_lettered.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-neutral-600">0</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-mono">
                      {r.new_products_created > 0 ? (
                        <span className="text-emerald-400">
                          +{r.new_products_created.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-neutral-600">0</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-mono text-neutral-500 text-xs">
                      {duration != null ? `${duration}s` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "emerald" | "red";
}) {
  const colorClass =
    accent === "emerald"
      ? "text-emerald-400"
      : accent === "red"
        ? "text-red-400"
        : "text-neutral-100";
  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl px-4 py-3">
      <div className={`text-2xl font-semibold tabular-nums ${colorClass}`}>
        {value}
      </div>
      <div className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
        {label}
      </div>
    </div>
  );
}
