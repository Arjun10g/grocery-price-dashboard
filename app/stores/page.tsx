import { supabase } from "@/lib/supabase";

export const revalidate = 600;

type StoreRow = {
  id: string;
  retailer_id: string;
  display_name: string;
  region: string;
  city: string | null;
};

async function fetchStoresByRegion() {
  const { data, error } = await supabase
    .from("stores")
    .select("id, retailer_id, display_name, region, city")
    .order("region")
    .order("city")
    .limit(2000);
  if (error) throw error;
  const rows = (data ?? []) as StoreRow[];
  const byRegion = new Map<string, StoreRow[]>();
  for (const r of rows) {
    const list = byRegion.get(r.region) ?? [];
    list.push(r);
    byRegion.set(r.region, list);
  }
  return byRegion;
}

export default async function StoresPage() {
  const byRegion = await fetchStoresByRegion();
  const regions = Array.from(byRegion.entries()).sort(
    (a, b) => b[1].length - a[1].length,
  );
  const total = regions.reduce((acc, [, list]) => acc + list.length, 0);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold">Stores</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {total.toLocaleString()} grocery store locations discovered via the{" "}
          <a
            href="https://github.com/Arjun10g/grocery-price-rag/blob/main/sources/osm_overpass"
            className="underline"
          >
            osm_overpass
          </a>{" "}
          source. Used to resolve <code className="font-mono">store_id</code> on
          observations from sources that emit OSM IDs (Open Food Facts).
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {regions.map(([region, list]) => (
          <div
            key={region}
            className="bg-white border border-neutral-200 rounded-lg"
          >
            <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
              <span className="font-mono font-semibold">{region}</span>
              <span className="text-xs text-neutral-500">
                {list.length.toLocaleString()} stores
              </span>
            </div>
            <ul className="text-xs divide-y divide-neutral-100 max-h-64 overflow-y-auto">
              {list.slice(0, 50).map((s) => (
                <li
                  key={s.id}
                  className="px-4 py-1.5 flex justify-between gap-3"
                >
                  <span className="truncate">{s.display_name}</span>
                  <span className="text-neutral-500 shrink-0">
                    {s.city ?? "—"}
                  </span>
                </li>
              ))}
              {list.length > 50 ? (
                <li className="px-4 py-1.5 text-neutral-400 italic">
                  …{list.length - 50} more
                </li>
              ) : null}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
