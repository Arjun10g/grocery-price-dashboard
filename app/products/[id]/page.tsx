import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/lib/database.types";
import { formatPrice, formatRelativeTime, formatSize } from "@/lib/format";
import { PriceHistoryChart } from "./PriceHistoryChart";

export const revalidate = 60;

async function fetchProduct(id: number): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Product | null;
}

type ObsRow = {
  observation_id: string;
  source_id: string;
  retailer_id: string | null;
  store_id: string | null;
  price_cents: number;
  currency: string;
  sale_type: string | null;
  observed_at: string;
  source_url: string | null;
  confidence_score: number | null;
};

async function fetchObservations(productId: number): Promise<ObsRow[]> {
  const { data, error } = await supabase
    .from("price_observations")
    .select(
      "observation_id, source_id, retailer_id, store_id, price_cents, currency, sale_type, observed_at, source_url, confidence_score",
    )
    .eq("product_id", productId)
    .order("observed_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as ObsRow[];
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isFinite(productId)) notFound();

  const [product, observations] = await Promise.all([
    fetchProduct(productId),
    fetchObservations(productId),
  ]);
  if (!product) notFound();

  const size = formatSize(product.size_value, product.size_unit);
  const latest = observations[0];
  const oldest = observations[observations.length - 1];

  // Per-retailer latest snapshot.
  const byRetailer = new Map<string, ObsRow>();
  for (const o of observations) {
    const key = o.retailer_id ?? `(${o.source_id})`;
    if (!byRetailer.has(key)) byRetailer.set(key, o);
  }
  const retailerSnapshot = Array.from(byRetailer.entries()).sort(
    (a, b) => a[1].price_cents - b[1].price_cents,
  );

  // Aggregate stats.
  const prices = observations.map((o) => o.price_cents);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / Math.max(prices.length, 1);
  const median = prices.slice().sort((a, b) => a - b)[
    Math.floor(prices.length / 2)
  ];

  // Recent trend (compare latest vs. average of prior 30d window).
  const NOW = Date.now();
  const recentObs = observations.filter(
    (o) => new Date(o.observed_at).getTime() > NOW - 30 * 86400_000,
  );
  const olderObs = observations.filter(
    (o) =>
      new Date(o.observed_at).getTime() <= NOW - 30 * 86400_000 &&
      new Date(o.observed_at).getTime() > NOW - 90 * 86400_000,
  );
  const recentAvg =
    recentObs.length > 0
      ? recentObs.reduce((a, b) => a + b.price_cents, 0) / recentObs.length
      : null;
  const olderAvg =
    olderObs.length > 0
      ? olderObs.reduce((a, b) => a + b.price_cents, 0) / olderObs.length
      : null;
  const trendPct =
    recentAvg != null && olderAvg != null && olderAvg > 0
      ? ((recentAvg - olderAvg) / olderAvg) * 100
      : null;

  const chartData = observations
    .slice()
    .reverse()
    .map((o) => ({
      t: new Date(o.observed_at).getTime(),
      price: o.price_cents / 100,
      retailer: o.retailer_id ?? o.source_id,
    }));

  return (
    <div className="space-y-8">
      <Link
        href="/"
        className="text-xs text-neutral-500 hover:text-neutral-300 inline-flex items-center gap-1"
      >
        ← back to feed
      </Link>

      <header className="flex items-start justify-between gap-6 flex-wrap">
        <div className="space-y-2 min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {product.display_name}
          </h1>
          <div className="flex gap-2 flex-wrap items-center text-xs">
            {product.brand ? (
              <span className="px-2 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300">
                {product.brand}
              </span>
            ) : null}
            {size ? (
              <span className="px-2 py-1 rounded-md bg-neutral-900 border border-neutral-800 font-mono text-neutral-300">
                {size}
              </span>
            ) : null}
            {product.category ? (
              <span className="px-2 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-400">
                {product.category}
              </span>
            ) : null}
            {product.upc ? (
              <span className="px-2 py-1 rounded-md bg-neutral-900 border border-neutral-800 font-mono text-neutral-500">
                UPC {product.upc}
              </span>
            ) : null}
            {product.plu_code ? (
              <span className="px-2 py-1 rounded-md bg-neutral-900 border border-neutral-800 font-mono text-neutral-500">
                PLU {product.plu_code}
              </span>
            ) : null}
            {product.needs_review ? (
              <span className="px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] uppercase tracking-wider">
                needs review
              </span>
            ) : null}
          </div>
        </div>
        {latest ? (
          <div className="text-right shrink-0">
            <div className="text-3xl sm:text-4xl font-semibold tabular-nums text-emerald-400">
              {formatPrice(latest.price_cents, latest.currency)}
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              latest · {latest.retailer_id ?? latest.source_id} ·{" "}
              {formatRelativeTime(latest.observed_at)}
            </div>
            {trendPct != null ? (
              <div
                className={`text-xs mt-1 font-mono ${
                  trendPct > 1
                    ? "text-red-400"
                    : trendPct < -1
                      ? "text-emerald-400"
                      : "text-neutral-500"
                }`}
              >
                {trendPct > 0 ? "↑" : trendPct < 0 ? "↓" : "→"}{" "}
                {Math.abs(trendPct).toFixed(1)}% vs prior 30–90d
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat
          label="observations"
          value={observations.length.toLocaleString()}
        />
        <Stat label="min" value={formatPrice(min)} accent="emerald" />
        <Stat label="median" value={formatPrice(median ?? avg)} />
        <Stat label="avg" value={formatPrice(Math.round(avg))} />
        <Stat label="max" value={formatPrice(max)} accent="red" />
      </section>

      {chartData.length > 1 ? (
        <section className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-200 uppercase tracking-wide">
              Price history
            </h2>
            <span className="text-xs text-neutral-500">
              {observations.length} observations · since{" "}
              {oldest
                ? new Date(oldest.observed_at).toISOString().slice(0, 10)
                : "—"}
            </span>
          </div>
          <PriceHistoryChart data={chartData} />
        </section>
      ) : null}

      {retailerSnapshot.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide text-neutral-300">
            Latest by retailer
          </h2>
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl divide-y divide-neutral-800/80 overflow-hidden">
            {retailerSnapshot.map(([retailer, o]) => {
              const cheapest = retailerSnapshot[0][1].price_cents;
              const delta = o.price_cents - cheapest;
              return (
                <div
                  key={o.observation_id}
                  className="px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-neutral-100 truncate">
                      {retailer}
                    </span>
                    <span className="text-xs text-neutral-500 mt-0.5">
                      via {o.source_id} ·{" "}
                      {formatRelativeTime(o.observed_at)}
                      {o.confidence_score != null
                        ? ` · conf ${o.confidence_score.toFixed(2)}`
                        : ""}
                      {o.store_id ? ` · ${o.store_id}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {o.sale_type && o.sale_type !== "regular" ? (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-mono uppercase tracking-wider">
                        {o.sale_type}
                      </span>
                    ) : null}
                    <span className="font-mono tabular-nums text-base text-neutral-100">
                      {formatPrice(o.price_cents, o.currency)}
                    </span>
                    {delta > 0 ? (
                      <span className="text-xs text-neutral-500 w-16 text-right font-mono">
                        +{formatPrice(delta)}
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-400 w-16 text-right font-mono uppercase tracking-wider">
                        cheapest
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
            All observations
          </h2>
          <span className="text-xs text-neutral-500">
            most recent first · scroll
          </span>
        </div>
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl divide-y divide-neutral-800/80 overflow-hidden text-sm max-h-96 overflow-y-auto">
          {observations.map((o) => (
            <div
              key={o.observation_id}
              className="px-4 py-2 flex items-center justify-between gap-3"
            >
              <div className="text-xs text-neutral-500 truncate">
                <span className="font-mono text-neutral-400">
                  {new Date(o.observed_at).toISOString().slice(0, 10)}
                </span>
                <span className="mx-2 text-neutral-600">·</span>
                <span className="text-neutral-300">
                  {o.retailer_id ?? o.source_id}
                </span>
                {o.source_url ? (
                  <>
                    <span className="mx-2 text-neutral-600">·</span>
                    <a
                      href={o.source_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline hover:text-neutral-300"
                    >
                      source
                    </a>
                  </>
                ) : null}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {o.sale_type && o.sale_type !== "regular" ? (
                  <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">
                    {o.sale_type}
                  </span>
                ) : null}
                <span className="font-mono tabular-nums text-neutral-100">
                  {formatPrice(o.price_cents, o.currency)}
                </span>
              </div>
            </div>
          ))}
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
      <div
        className={`text-lg sm:text-xl font-semibold tabular-nums font-mono ${colorClass}`}
      >
        {value}
      </div>
      <div className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
        {label}
      </div>
    </div>
  );
}
