import { admin, json } from '../_shared/claude.ts';

/**
 * Live GCP pricing.
 *
 * Napkin Math is only worth practicing against numbers that are actually
 * current, an estimate rehearsed against last year's SKU price teaches a
 * wrong instinct. The Cloud Billing Catalog API publishes list prices for every
 * public service and SKU, so the arithmetic drills can be computed against real
 * figures rather than hard-coded ones.
 *
 * Needs GCP_PRICING_API_KEY in function secrets (an API key with the Cloud
 * Billing API enabled). No model calls, so this is cheap enough to run daily.
 */

const SERVICES: Record<string, string> = {
  // Service ids from services.list. Kept explicit rather than fetched wholesale
  // because the full catalog is tens of thousands of SKUs and the drills only
  // reference a handful of families.
  'Compute Engine': '6F81-5844-456A',
  'Cloud Storage': '95FF-2EF5-5EA1',
  BigQuery: '24E6-581D-38E5',
};

interface Sku {
  skuId: string;
  description: string;
  pricingInfo?: {
    pricingExpression?: {
      usageUnit?: string;
      tieredRates?: { unitPrice?: { units?: string; nanos?: number } }[];
    };
  }[];
  serviceRegions?: string[];
}

function unitPrice(sku: Sku): number | null {
  const tier = sku.pricingInfo?.[0]?.pricingExpression?.tieredRates?.at(-1)?.unitPrice;
  if (!tier) return null;
  return Number(tier.units ?? 0) + (tier.nanos ?? 0) / 1e9;
}

Deno.serve(async () => {
  const apiKey = Deno.env.get('GCP_PRICING_API_KEY');
  if (!apiKey) return json({ ok: false, error: 'GCP_PRICING_API_KEY is not set' }, 400);

  const db = admin();
  const summary: Record<string, { fetched: number; stored: number; error?: string }> = {};

  for (const [name, serviceId] of Object.entries(SERVICES)) {
    try {
      const url = new URL(
        `https://cloudbilling.googleapis.com/v1/services/${serviceId}/skus`
      );
      url.searchParams.set('key', apiKey);
      url.searchParams.set('pageSize', '500');

      const response = await fetch(url);
      if (!response.ok) {
        summary[name] = { fetched: 0, stored: 0, error: `HTTP ${response.status}` };
        continue;
      }

      const body = (await response.json()) as { skus?: Sku[] };
      const skus = body.skus ?? [];
      const rows = skus
        .map((sku) => {
          const price = unitPrice(sku);
          if (price === null) return null;
          return {
            sku_id: sku.skuId,
            service_id: serviceId,
            description: sku.description.slice(0, 500),
            unit: sku.pricingInfo?.[0]?.pricingExpression?.usageUnit ?? 'unit',
            unit_price: price,
            region: sku.serviceRegions?.[0] ?? null,
            fetched_at: new Date().toISOString(),
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      // Upsert so a price change updates in place and the drill picks it up on
      // the next content sync without a migration.
      const { error } = await db.from('pricing_snapshots').upsert(rows, { onConflict: 'sku_id' });
      summary[name] = {
        fetched: skus.length,
        stored: error ? 0 : rows.length,
        ...(error ? { error: error.message } : {}),
      };
    } catch (error) {
      summary[name] = {
        fetched: 0,
        stored: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return json({ ok: true, summary });
});
