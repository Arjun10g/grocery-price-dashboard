// Hand-rolled minimal types — only the columns the dashboard reads.
// Source of truth lives in the ingestion repo's
// supabase/schemas/*.sql. Regenerate with `supabase gen types
// typescript --linked` if column drift becomes an issue.

export type Source = {
  id: string;
  display_name: string;
  source_type: string;
  base_confidence: number | null;
  homepage_url: string | null;
  notes: string | null;
};

export type Retailer = {
  id: string;
  display_name: string;
  parent_company: string | null;
  website_url: string | null;
};

export type Region =
  | "AB" | "BC" | "MB" | "NB" | "NL" | "NS" | "NT" | "NU"
  | "ON" | "PE" | "QC" | "SK" | "YT" | "CA";

export type Store = {
  id: string;
  retailer_id: string;
  display_name: string;
  region: Region;
  city: string | null;
  postal_code: string | null;
  address_line: string | null;
  latitude: number | null;
  longitude: number | null;
  external_ids: Record<string, string> | null;
};

export type Product = {
  id: number; // bigint
  upc: string | null;
  plu_code: string | null;
  brand: string | null;
  normalized_brand: string;
  normalized_name: string;
  display_name: string;
  size_value: number | null;
  size_unit: string | null;
  normalized_size_grams: number | null;
  normalized_size_ml: number | null;
  pack_count: number | null;
  category: string | null;
  needs_review: boolean;
  created_at: string;
  updated_at: string;
};

export type SaleType =
  | "regular" | "sale" | "multibuy" | "bogo" | "club" | "clearance";

export type ExtractionMethod =
  | "API_JSON" | "HTML_PARSE" | "HTML_EMBEDDED_JSON" | "JSONLD"
  | "VLM_VISION" | "OFFICIAL_STATS";

export type PriceObservation = {
  observation_id: string;
  source_id: string;
  retailer_id: string | null;
  store_id: string | null;
  product_id: number;
  price_cents: number;
  currency: string;
  sale_type: SaleType;
  observed_at: string;
  valid_from: string | null;
  valid_to: string | null;
  source_url: string | null;
  source_page: number | null;
  extraction_method: ExtractionMethod;
  confidence_score: number;
  confidence_components: Record<string, number> | null;
  created_at: string;
};

export type RunStatus =
  | "running" | "succeeded" | "failed" | "partial" | "interrupted";

export type PipelineRun = {
  id: string;
  source_id: string;
  status: RunStatus;
  started_at: string;
  finished_at: string | null;
  items_attempted: number;
  items_ingested: number;
  items_dead_lettered: number;
  new_products_created: number;
  errors: Array<{ stage: string; message: string }>;
};

export type Database = {
  public: {
    Tables: {
      sources: { Row: Source };
      retailers: { Row: Retailer };
      stores: { Row: Store };
      products: { Row: Product };
      price_observations: { Row: PriceObservation };
      pipeline_runs: { Row: PipelineRun };
    };
  };
};
