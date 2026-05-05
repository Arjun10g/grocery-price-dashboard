import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatSize } from "@/lib/format";

export const revalidate = 30;

type SearchHit = {
  id: number;
  display_name: string;
  brand: string | null;
  size_value: number | null;
  size_unit: string | null;
  category: string | null;
  upc: string | null;
};

async function searchProducts(query: string): Promise<SearchHit[]> {
  if (!query.trim()) return [];
  const safe = query.trim().replace(/[%,]/g, "");
  const { data, error } = await supabase
    .from("products")
    .select("id, display_name, brand, size_value, size_unit, category, upc")
    .or(`display_name.ilike.%${safe}%,brand.ilike.%${safe}%`)
    .order("display_name")
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as SearchHit[];
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const results = await searchProducts(query);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-neutral-500">
          Plain ILIKE on product display name + brand. The schema also has a
          populated <code className="font-mono text-neutral-400">embedding</code>{" "}
          column and a <code className="font-mono text-neutral-400">keywords_tsvector</code>{" "}
          for future hybrid retrieval; the dashboard doesn&apos;t query them yet.
        </p>
      </div>

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
            defaultValue={query}
            placeholder="Search products"
            className="w-full pl-9 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50"
            autoFocus
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-lg text-sm font-semibold transition-colors"
        >
          Search
        </button>
      </form>

      {query ? (
        <div className="text-sm text-neutral-500">
          {results.length === 50
            ? "Top 50 results"
            : `${results.length} ${results.length === 1 ? "result" : "results"}`}{" "}
          for{" "}
          <span className="font-medium text-neutral-200 px-1.5 py-0.5 bg-neutral-800 rounded font-mono">
            {query}
          </span>
        </div>
      ) : (
        <div className="text-sm text-neutral-500">
          Enter a query to search the catalog.
        </div>
      )}

      <ul className="bg-neutral-900/60 border border-neutral-800 rounded-xl divide-y divide-neutral-800/80 overflow-hidden">
        {results.map((p) => {
          const size = formatSize(p.size_value, p.size_unit);
          return (
            <li key={p.id} className="hover:bg-neutral-900 transition-colors">
              <Link href={`/products/${p.id}`} className="block px-4 py-3 text-sm">
                <div className="font-medium text-neutral-100 truncate">
                  {p.display_name}
                </div>
                <div className="text-xs text-neutral-500 flex gap-3 mt-1 flex-wrap items-center">
                  {p.brand ? (
                    <span className="text-neutral-400">{p.brand}</span>
                  ) : null}
                  {size ? (
                    <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-[10px]">
                      {size}
                    </span>
                  ) : null}
                  {p.category ? (
                    <span className="text-neutral-500">{p.category}</span>
                  ) : null}
                  {p.upc ? (
                    <span className="font-mono text-[10px] text-neutral-600">
                      UPC {p.upc}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
