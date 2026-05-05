import { supabase } from "@/lib/supabase";
import { formatRelativeTime } from "@/lib/format";

export const revalidate = 60;

type SourceRow = {
  id: string;
  display_name: string;
  source_type: string;
  base_confidence: number | null;
  homepage_url: string | null;
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
    .select("id, display_name, source_type, base_confidence, homepage_url")
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
  succeeded: "bg-emerald-100 text-emerald-900",
  failed: "bg-red-100 text-red-900",
  partial: "bg-amber-100 text-amber-900",
  interrupted: "bg-amber-100 text-amber-900",
  running: "bg-sky-100 text-sky-900",
};

export default async function SourcesPage() {
  const [sources, runs] = await Promise.all([fetchSources(), fetchRecentRuns()]);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold">Pipeline sources</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Each row is one source module under{" "}
          <code className="font-mono">/sources</code> in the ingestion repo.
          Confidence is the source-level base; per-observation scores are
          composed from extraction confidence, recency, and (eventually)
          cross-source agreement.
        </p>
        <div className="mt-4 bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-200 text-sm">
          {sources.map((s) => (
            <div key={s.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{s.display_name}</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  <code className="font-mono">{s.id}</code> · {s.source_type}
                  {s.homepage_url ? (
                    <>
                      {" · "}
                      <a
                        href={s.homepage_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="underline hover:text-neutral-900"
                      >
                        site
                      </a>
                    </>
                  ) : null}
                </div>
              </div>
              <span className="font-mono tabular-nums text-sm text-neutral-600">
                {s.base_confidence != null ? s.base_confidence.toFixed(2) : "—"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Recent pipeline runs</h2>
        <div className="mt-3 bg-white border border-neutral-200 rounded-lg overflow-hidden text-sm">
          <table className="w-full">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">started</th>
                <th className="text-left px-4 py-2 font-medium">source</th>
                <th className="text-left px-4 py-2 font-medium">status</th>
                <th className="text-right px-4 py-2 font-medium">ingested</th>
                <th className="text-right px-4 py-2 font-medium">dlq</th>
                <th className="text-right px-4 py-2 font-medium">new prods</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 text-neutral-500">
                    {formatRelativeTime(r.started_at)}
                  </td>
                  <td className="px-4 py-2 font-mono">{r.source_id}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        STATUS_STYLE[r.status] ?? "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {r.items_ingested.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {r.items_dead_lettered > 0 ? (
                      <span className="text-red-700">
                        {r.items_dead_lettered.toLocaleString()}
                      </span>
                    ) : (
                      r.items_dead_lettered
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {r.new_products_created.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
