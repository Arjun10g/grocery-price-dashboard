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
      "observation_id, source_id, retailer_id, price_cents, currency, sale_type, observed_at, source_url, confidence_score",
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

  // Per-retailer latest snapshot.
  const byRetailer = new Map<string, ObsRow>();
  for (const o of observations) {
    const key = o.retailer_id ?? `(${o.source_id})`;
    if (!byRetailer.has(key)) byRetailer.set(key, o);
  }
  const retailerSnapshot = Array.from(byRetailer.entries()).sort(
    (a, b) => a[1].price_cents - b[1].price_cents,
  );

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
      <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← back to feed
      </Link>

      <header className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold">{product.display_name}</h1>
          <div className="mt-1 text-sm text-neutral-500 flex gap-3 flex-wrap">
            {product.brand ? <span>{product.brand}</span> : null}
            {size ? <span>{size}</span> : null}
            {product.category ? <span>{product.category}</span> : null}
            {product.upc ? (
              <span className="font-mono">UPC {product.upc}</span>
            ) : null}
            {product.plu_code ? (
              <span className="font-mono">PLU {product.plu_code}</span>
            ) : null}
          </div>
        </div>
        {latest ? (
          <div className="text-right">
            <div className="text-3xl font-semibold tabular-nums">
              {formatPrice(latest.price_cents, latest.currency)}
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              latest from {latest.retailer_id ?? latest.source_id} ·{" "}
              {formatRelativeTime(latest.observed_at)}
            </div>
          </div>
        ) : null}
      </header>

      {chartData.length > 1 ? (
        <section className="bg-white border border-neutral-200 rounded-lg p-4">
          <h2 className="text-sm font-medium mb-3">
            Price history · {observations.length} observations
          </h2>
          <PriceHistoryChart data={chartData} />
        </section>
      ) : null}

      {retailerSnapshot.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide text-neutral-500">
            Latest by retailer
          </h2>
          <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-200 text-sm">
            {retailerSnapshot.map(([retailer, o]) => (
              <div
                key={o.observation_id}
                className="px-4 py-3 flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{retailer}</span>
                  <span className="text-xs text-neutral-500">
                    {o.source_id} · {formatRelativeTime(o.observed_at)}
                    {o.confidence_score
                      ? ` · conf ${o.confidence_score.toFixed(2)}`
                      : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {o.sale_type && o.sale_type !== "regular" ? (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-xs rounded">
                      {o.sale_type}
                    </span>
                  ) : null}
                  <span className="font-mono tabular-nums">
                    {formatPrice(o.price_cents, o.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide text-neutral-500">
          All observations · most recent first
        </h2>
        <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-200 text-sm max-h-96 overflow-y-auto">
          {observations.map((o) => (
            <div
              key={o.observation_id}
              className="px-4 py-2 flex items-center justify-between"
            >
              <div className="text-xs text-neutral-500">
                {new Date(o.observed_at).toISOString().slice(0, 10)} ·{" "}
                {o.retailer_id ?? o.source_id}
                {o.source_url ? (
                  <>
                    {" · "}
                    <a
                      href={o.source_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline hover:text-neutral-900"
                    >
                      source
                    </a>
                  </>
                ) : null}
              </div>
              <span className="font-mono tabular-nums">
                {formatPrice(o.price_cents, o.currency)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
