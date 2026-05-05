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
  // Phase 24 MVP search — ILIKE on display_name + brand. Phase 1
  // populated keywords_tsvector and an embedding column for future
  // hybrid retrieval; the dashboard sticks to plain ILIKE until
  // those layers ship.
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
      <form action="/search" className="flex gap-2 max-w-xl">
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search products"
          className="flex-1 px-4 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
          autoFocus
        />
        <button
          type="submit"
          className="px-4 py-2 bg-neutral-900 text-white rounded-md text-sm font-medium hover:bg-neutral-800"
        >
          Search
        </button>
      </form>

      {query ? (
        <p className="text-sm text-neutral-500">
          {results.length === 50 ? "Top 50 results" : `${results.length} results`}{" "}
          for <span className="font-medium text-neutral-900">{query}</span>
        </p>
      ) : (
        <p className="text-sm text-neutral-500">Enter a query to search.</p>
      )}

      <ul className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-200">
        {results.map((p) => {
          const size = formatSize(p.size_value, p.size_unit);
          return (
            <li key={p.id} className="px-4 py-3 text-sm">
              <Link href={`/products/${p.id}`} className="flex justify-between hover:underline">
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.display_name}</div>
                  <div className="text-neutral-500 text-xs flex gap-3 mt-0.5">
                    {p.brand ? <span>{p.brand}</span> : null}
                    {size ? <span>{size}</span> : null}
                    {p.category ? <span>{p.category}</span> : null}
                    {p.upc ? <span className="font-mono">UPC {p.upc}</span> : null}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
