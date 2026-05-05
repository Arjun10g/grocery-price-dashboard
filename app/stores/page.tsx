import { supabase } from "@/lib/supabase";

export const revalidate = 600;

type StoreRow = {
  id: string;
  retailer_id: string;
  display_name: string;
  region: string;
  city: string | null;
  postal_code: string | null;
};

const REGION_NAMES: Record<string, string> = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland & Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
  CA: "Canada (national)",
};

async function fetchStoresByRegion() {
  const { data, error } = await supabase
    .from("stores")
    .select("id, retailer_id, display_name, region, city, postal_code")
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

  // Per-retailer breakdown across all regions.
  const byRetailer = new Map<string, number>();
  for (const [, list] of byRegion) {
    for (const s of list) {
      byRetailer.set(s.retailer_id, (byRetailer.get(s.retailer_id) ?? 0) + 1);
    }
  }
  const retailerBreakdown = Array.from(byRetailer.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Stores</h1>
        <p className="mt-1.5 text-sm text-neutral-400 max-w-3xl">
          {total.toLocaleString()} grocery store locations discovered via the{" "}
          <a
            href="https://github.com/Arjun10g/grocery-price-rag/tree/main/sources/osm_overpass"
            className="underline hover:text-neutral-200"
          >
            osm_overpass
          </a>{" "}
          source. Used to resolve <code className="font-mono text-neutral-300">store_id</code>{" "}
          on observations from sources that emit OSM IDs (Open Food Facts).
        </p>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="stores" value={total.toLocaleString()} accent />
        <Stat label="provinces" value={regions.length.toLocaleString()} />
        <Stat
          label="retailers"
          value={retailerBreakdown.length.toLocaleString()}
        />
        <Stat
          label="largest region"
          value={regions[0] ? regions[0][0] : "—"}
        />
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-300 mb-3">
          By retailer
        </h2>
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5">
          <ul className="space-y-2.5">
            {retailerBreakdown.slice(0, 14).map((r) => {
              const max = retailerBreakdown[0]?.[1] ?? 1;
              const pct = (r[1] / max) * 100;
              return (
                <li key={r[0]}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-mono text-neutral-300">{r[0]}</span>
                    <span className="font-mono tabular-nums text-neutral-400">
                      {r[1].toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-sky-400"
                      style={{ width: `${Math.max(pct, 0.5)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-300 mb-3">
          By province
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {regions.map(([region, list]) => (
            <div
              key={region}
              className="bg-neutral-900/60 border border-neutral-800 rounded-xl overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-900">
                <div>
                  <span className="font-mono font-semibold text-neutral-100">
                    {region}
                  </span>
                  <span className="ml-2 text-xs text-neutral-500">
                    {REGION_NAMES[region] ?? region}
                  </span>
                </div>
                <span className="text-xs text-emerald-400 font-mono tabular-nums">
                  {list.length.toLocaleString()}
                </span>
              </div>
              <ul className="text-xs divide-y divide-neutral-800/60 max-h-72 overflow-y-auto">
                {list.slice(0, 80).map((s) => (
                  <li
                    key={s.id}
                    className="px-4 py-1.5 flex justify-between gap-3 hover:bg-neutral-900 transition-colors"
                  >
                    <span className="truncate text-neutral-300">
                      {s.display_name}
                    </span>
                    <span className="text-neutral-500 shrink-0 font-mono">
                      {s.city ?? "—"}
                    </span>
                  </li>
                ))}
                {list.length > 80 ? (
                  <li className="px-4 py-1.5 text-neutral-600 italic">
                    …{list.length - 80} more
                  </li>
                ) : null}
              </ul>
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
        className={`text-2xl font-semibold tabular-nums ${
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
