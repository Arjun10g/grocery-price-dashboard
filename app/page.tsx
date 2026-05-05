import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatPrice, formatRelativeTime } from "@/lib/format";

export const revalidate = 60;

const SOURCES = [
  "pc_express",
  "voila",
  "statcan_wds",
  "schema_org",
  "off_open_prices",
  "metro",
  "walmart",
  "osm_overpass",
  "flyer_vlm",
] as const;

async function fetchOverviewStats() {
  const [obs, products, stores, sources, runs, dlq] = await Promise.all([
    supabase
      .from("price_observations")
      .select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("stores").select("*", { count: "exact", head: true }),
    supabase.from("sources").select("*", { count: "exact", head: true }),
    supabase.from("pipeline_runs").select("*", { count: "exact", head: true }),
    supabase
      .from("price_observations")
      .select("*", { count: "exact", head: true })
      .gte(
        "observed_at",
        new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
      ),
  ]);
  return {
    observations: obs.count ?? 0,
    products: products.count ?? 0,
    stores: stores.count ?? 0,
    sources: sources.count ?? 0,
    runs: runs.count ?? 0,
    last7d: dlq.count ?? 0,
  };
}

async function fetchPerSourceCounts() {
  const out: Array<{ source_id: string; count: number }> = [];
  for (const s of SOURCES) {
    const { count } = await supabase
      .from("price_observations")
      .select("*", { count: "exact", head: true })
      .eq("source_id", s);
    out.push({ source_id: s, count: count ?? 0 });
  }
  out.sort((a, b) => b.count - a.count);
  return out;
}

type RecentRow = {
  observation_id: string;
  product_id: number;
  source_id: string;
  retailer_id: string | null;
  price_cents: number;
  currency: string;
  observed_at: string;
  sale_type: string | null;
  products: { display_name: string; brand: string | null } | null;
};

async function fetchRecentObservations(): Promise<RecentRow[]> {
  const { data, error } = await supabase
    .from("price_observations")
    .select(
      "observation_id, product_id, source_id, retailer_id, price_cents, currency, observed_at, sale_type, products(display_name, brand)",
    )
    .order("observed_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as unknown as RecentRow[];
}

async function fetchTopRetailers() {
  // Hand-rolled aggregation — Supabase JS doesn't expose group-by
  // without the `.rpc()` flow, and we don't have a function defined
  // for this yet. Cap each retailer at one count() roundtrip.
  const retailers = [
    "no_frills",
    "loblaws",
    "rcss",
    "fortinos",
    "maxi",
    "provigo",
    "voila",
    "sobeys",
    "freshco",
    "iga",
    "safeway",
    "metro",
    "food_basics",
    "super_c",
    "walmart_ca",
    "summerhill_market",
  ];
  const results = await Promise.all(
    retailers.map(async (r) => {
      const { count } = await supabase
        .from("price_observations")
        .select("*", { count: "exact", head: true })
        .eq("retailer_id", r);
      return { retailer_id: r, count: count ?? 0 };
    }),
  );
  return results.filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
}

export default async function HomePage() {
  const [stats, perSource, recent, topRetailers] = await Promise.all([
    fetchOverviewStats(),
    fetchPerSourceCounts(),
    fetchRecentObservations(),
    fetchTopRetailers(),
  ]);

  const activeSources = perSource.filter((s) => s.count > 0).length;
  const totalObs = perSource.reduce((acc, s) => acc + s.count, 0);

  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            live · {activeSources} of 9 sources active
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            Canadian grocery prices, live.
          </h1>
          <p className="text-neutral-400 max-w-2xl text-base leading-relaxed">
            {stats.observations.toLocaleString()} price sightings across{" "}
            {stats.products.toLocaleString()} products and{" "}
            {stats.stores.toLocaleString()} grocery store locations. Ingested
            biweekly from StatCan, Loblaws &amp; Sobeys retailer APIs,
            Schema.org markup on independents, and Open Food Facts. Append-only,
            with full provenance.
          </p>
        </div>
        <SearchBar />
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat
          label="observations"
          value={stats.observations.toLocaleString()}
          accent
        />
        <Stat label="products" value={stats.products.toLocaleString()} />
        <Stat label="stores" value={stats.stores.toLocaleString()} />
        <Stat label="sources" value={`${activeSources} / 9`} />
        <Stat label="pipeline runs" value={stats.runs.toLocaleString()} />
        <Stat label="obs · last 7d" value={stats.last7d.toLocaleString()} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-semibold text-neutral-200 uppercase tracking-wide">
              Observations by source
            </h2>
            <span className="text-xs text-neutral-500">
              {totalObs.toLocaleString()} total
            </span>
          </div>
          <ul className="space-y-2.5">
            {perSource.map((s) => {
              const pct = totalObs > 0 ? (s.count / totalObs) * 100 : 0;
              return (
                <li key={s.source_id}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-mono text-neutral-300">
                      {s.source_id}
                    </span>
                    <span className="font-mono tabular-nums text-neutral-400">
                      {s.count.toLocaleString()}{" "}
                      <span className="text-neutral-600">
                        · {pct.toFixed(1)}%
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                      style={{ width: `${Math.max(pct, 0.4)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-semibold text-neutral-200 uppercase tracking-wide">
              Top retailers
            </h2>
            <span className="text-xs text-neutral-500">
              {topRetailers.length} active
            </span>
          </div>
          <ul className="space-y-2.5">
            {topRetailers.slice(0, 12).map((r, i) => {
              const max = topRetailers[0]?.count ?? 1;
              const pct = (r.count / max) * 100;
              return (
                <li key={r.retailer_id}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-mono text-neutral-300">
                      <span className="text-neutral-600 mr-2">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {r.retailer_id}
                    </span>
                    <span className="font-mono tabular-nums text-neutral-400">
                      {r.count.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-sky-400"
                      style={{ width: `${Math.max(pct, 0.4)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold text-neutral-200 uppercase tracking-wide">
            Most recent observations
          </h2>
          <Link
            href="/sources"
            className="text-xs text-neutral-500 hover:text-neutral-300"
          >
            view pipeline activity →
          </Link>
        </div>
        <ul className="bg-neutral-900/60 border border-neutral-800 rounded-xl divide-y divide-neutral-800/80 overflow-hidden">
          {recent.map((r) => (
            <li
              key={r.observation_id}
              className="px-4 py-3 hover:bg-neutral-900 transition-colors"
            >
              <Link
                href={`/products/${r.product_id}`}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-neutral-100 truncate">
                    {r.products?.display_name ?? `Product #${r.product_id}`}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 flex gap-2 items-center flex-wrap">
                    {r.products?.brand ? (
                      <span>{r.products.brand}</span>
                    ) : null}
                    {r.retailer_id ? (
                      <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-[10px]">
                        {r.retailer_id}
                      </span>
                    ) : null}
                    <span className="text-neutral-600">via</span>
                    <span className="font-mono">{r.source_id}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {r.sale_type && r.sale_type !== "regular" ? (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-mono uppercase tracking-wider">
                      {r.sale_type}
                    </span>
                  ) : null}
                  <span className="font-mono tabular-nums text-base">
                    {formatPrice(r.price_cents, r.currency)}
                  </span>
                  <span className="text-xs text-neutral-500 w-16 text-right">
                    {formatRelativeTime(r.observed_at)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`bg-neutral-900/60 border rounded-xl px-4 py-3 ${
        accent ? "border-emerald-500/30" : "border-neutral-800"
      }`}
    >
      <div
        className={`text-xl sm:text-2xl font-semibold tabular-nums ${
          accent ? "text-emerald-400" : "text-neutral-100"
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
        {label}
      </div>
    </div>
  );
}

function SearchBar() {
  return (
    <form action="/search" className="flex gap-2 max-w-xl">
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          name="q"
          type="search"
          placeholder="Search products — milk, bread, kraft dinner…"
          className="w-full pl-9 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50"
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-lg text-sm font-semibold transition-colors"
      >
        Search
      </button>
    </form>
  );
}
