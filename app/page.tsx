import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatPrice, formatRelativeTime } from "@/lib/format";

export const revalidate = 60; // re-build at most once per minute

async function fetchOverviewStats() {
  const [obs, products, stores, sources] = await Promise.all([
    supabase
      .from("price_observations")
      .select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("stores").select("*", { count: "exact", head: true }),
    supabase.from("sources").select("*", { count: "exact", head: true }),
  ]);
  return {
    observations: obs.count ?? 0,
    products: products.count ?? 0,
    stores: stores.count ?? 0,
    sources: sources.count ?? 0,
  };
}

type RecentRow = {
  observation_id: string;
  product_id: number;
  source_id: string;
  retailer_id: string | null;
  price_cents: number;
  currency: string;
  observed_at: string;
  products: { display_name: string; brand: string | null } | null;
};

async function fetchRecentObservations(): Promise<RecentRow[]> {
  const { data, error } = await supabase
    .from("price_observations")
    .select(
      "observation_id, product_id, source_id, retailer_id, price_cents, currency, observed_at, products(display_name, brand)",
    )
    .order("observed_at", { ascending: false })
    .limit(15);
  if (error) throw error;
  return (data ?? []) as unknown as RecentRow[];
}

export default async function HomePage() {
  const [stats, recent] = await Promise.all([
    fetchOverviewStats(),
    fetchRecentObservations(),
  ]);

  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">
          Live Canadian grocery prices
        </h1>
        <p className="mt-2 text-neutral-600 max-w-2xl">
          Ingested every two weeks from {stats.sources} sources — StatCan
          provincial averages, retailer APIs (Loblaws banners, Sobeys
          banners), Schema.org markup on long-tail grocers, and crowdsourced
          Open Food Facts data. Append-only, with full provenance.
        </p>
        <SearchBar />
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="observations" value={stats.observations.toLocaleString()} />
        <Stat label="products" value={stats.products.toLocaleString()} />
        <Stat label="stores" value={stats.stores.toLocaleString()} />
        <Stat label="sources" value={stats.sources.toLocaleString()} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Recent observations</h2>
        <ul className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-200">
          {recent.map((r) => (
            <li
              key={r.observation_id}
              className="px-4 py-3 flex items-center justify-between text-sm"
            >
              <Link
                href={`/products/${r.product_id}`}
                className="flex-1 min-w-0 hover:underline"
              >
                <span className="font-medium text-neutral-900 truncate">
                  {r.products?.display_name ?? `Product #${r.product_id}`}
                </span>
                {r.products?.brand ? (
                  <span className="text-neutral-500 ml-2">
                    {r.products.brand}
                  </span>
                ) : null}
              </Link>
              <div className="flex items-center gap-4 ml-4 shrink-0">
                <span className="text-neutral-500 text-xs">{r.source_id}</span>
                <span className="font-mono">
                  {formatPrice(r.price_cents, r.currency)}
                </span>
                <span className="text-neutral-500 text-xs w-20 text-right">
                  {formatRelativeTime(r.observed_at)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg px-4 py-3">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-neutral-500 uppercase tracking-wide mt-0.5">
        {label}
      </div>
    </div>
  );
}

function SearchBar() {
  return (
    <form action="/search" className="mt-6 flex gap-2 max-w-xl">
      <input
        name="q"
        type="search"
        placeholder="Search products — e.g. milk, bread, kraft dinner"
        className="flex-1 px-4 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
      />
      <button
        type="submit"
        className="px-4 py-2 bg-neutral-900 text-white rounded-md text-sm font-medium hover:bg-neutral-800"
      >
        Search
      </button>
    </form>
  );
}
