/**
 * Client for Open Food Facts + Open Beauty Facts — the open database that the
 * commercial holistic scanners (Olive, Yuka, Fig) are built on top of.
 *
 * No API key. The one hard requirement is a descriptive User-Agent; generic ones
 * get rate limited. Reads are capped around 100 req/min (10/min for search), so
 * every response goes through an in-memory + AsyncStorage cache.
 *
 * Data is ODbL — see `ATTRIBUTION` and the credit shown on the product screen.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  NetworkError,
  Nutriments,
  OffProduct,
  Product,
  ProductKind,
  ProductNotFoundError,
  SearchHit,
} from './types';

const HOSTS: Record<ProductKind, string> = {
  food: 'https://world.openfoodfacts.org',
  cosmetic: 'https://world.openbeautyfacts.org',
};

export const ATTRIBUTION =
  'Product data from Open Food Facts & Open Beauty Facts, licensed under ODbL.';

const USER_AGENT =
  process.env.EXPO_PUBLIC_OFF_USER_AGENT ?? 'OliveScan/1.0 (support@olivescan.app)';

const PRODUCT_FIELDS = [
  'code',
  'product_name',
  'product_name_en',
  'generic_name',
  'brands',
  'quantity',
  'ingredients_text',
  'ingredients_text_en',
  'ingredients',
  'ingredients_analysis_tags',
  'additives_tags',
  'allergens_tags',
  'traces_tags',
  'labels_tags',
  'categories_tags',
  'nutriscore_grade',
  'nova_group',
  'ecoscore_grade',
  'nutriments',
  'image_front_url',
  'image_front_small_url',
  'image_url',
  'serving_size',
].join(',');

const SEARCH_FIELDS = 'code,product_name,brands,image_front_small_url,nutriscore_grade,nova_group';

const CACHE_PREFIX = '@olive/cache/';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // a week — ingredient lists rarely change
const REQUEST_TIMEOUT_MS = 12_000;

const memoryCache = new Map<string, { at: number; value: unknown }>();

async function readCache<T>(key: string): Promise<T | null> {
  const hit = memoryCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; value: T };
    if (Date.now() - parsed.at > CACHE_TTL_MS) return null;
    memoryCache.set(key, parsed);
    return parsed.value;
  } catch {
    return null;
  }
}

async function writeCache(key: string, value: unknown): Promise<void> {
  const entry = { at: Date.now(), value };
  memoryCache.set(key, entry);
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // A full disk should never break a scan.
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJsonOnce<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (res.status === 429) throw new NetworkError('Too many scans right now — try again shortly.');
    if (!res.ok) throw new NetworkError(`Product database returned ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof NetworkError) throw err;
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Open Food Facts is community-hosted and throws transient 502/503s under load,
 * so one quick retry turns most "failed scans" into successful ones.
 */
async function getJson<T>(url: string, retries = 1): Promise<T> {
  try {
    return await getJsonOnce<T>(url);
  } catch (err) {
    if (retries <= 0) throw err;
    await sleep(600);
    return getJson<T>(url, retries - 1);
  }
}

function num(value: unknown): number | undefined {
  const n = typeof value === 'string' ? parseFloat(value) : (value as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

function toNutriments(raw: Record<string, number | string | undefined> = {}): Nutriments {
  return {
    energyKcal: num(raw['energy-kcal_100g']) ?? num(raw['energy_100g']),
    fat: num(raw['fat_100g']),
    saturatedFat: num(raw['saturated-fat_100g']),
    carbohydrates: num(raw['carbohydrates_100g']),
    sugars: num(raw['sugars_100g']),
    fiber: num(raw['fiber_100g']),
    proteins: num(raw['proteins_100g']),
    salt: num(raw['salt_100g']),
    sodium: num(raw['sodium_100g']),
  };
}

/**
 * Open Food Facts is community-edited and loosely typed: a field documented as a
 * string comes back as an array (or a number) on a meaningful minority of records
 * — `brands` especially. Coerce everything through here before touching it.
 */
function str(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string').join(', ');
  if (typeof value === 'number') return String(value);
  return '';
}

/** First brand only — records often carry a whole comma-separated brand chain. */
function firstBrand(value: unknown): string {
  return str(value).split(',')[0].trim();
}

/** Tag fields are usually string[], but a malformed record can send anything. */
function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

/** Split a raw INCI / ingredients string into individual ingredient names. */
export function splitIngredients(text: string): string[] {
  if (!text) return [];
  return text
    .replace(/_/g, '')
    .replace(/\([^)]*\)/g, (m) => m.replace(/,/g, ';')) // keep parenthetical lists together
    .split(/[,.]\s*|\n/)
    .map((part) => part.replace(/[;]+/g, ', ').trim())
    .filter((part) => part.length > 1 && part.length < 120);
}

function normalise(raw: OffProduct, barcode: string, kind: ProductKind): Product {
  const ingredientsText = str(raw.ingredients_text_en) || str(raw.ingredients_text);
  const parsed = (Array.isArray(raw.ingredients) ? raw.ingredients : [])
    .map((i) => str(i?.text).trim())
    .filter(Boolean);

  return {
    barcode: str(raw.code) || barcode,
    kind,
    name:
      (str(raw.product_name_en) || str(raw.product_name) || str(raw.generic_name)).trim() ||
      'Unnamed product',
    brand: firstBrand(raw.brands),
    quantity: str(raw.quantity) || undefined,
    imageUrl: str(raw.image_front_url) || str(raw.image_url) || str(raw.image_front_small_url) || undefined,
    ingredientsText,
    ingredientList: parsed.length ? parsed : splitIngredients(ingredientsText),
    additives: strArray(raw.additives_tags),
    allergens: strArray(raw.allergens_tags),
    traces: strArray(raw.traces_tags),
    labels: strArray(raw.labels_tags),
    categories: strArray(raw.categories_tags),
    analysisTags: strArray(raw.ingredients_analysis_tags),
    nutriScore:
      str(raw.nutriscore_grade) && str(raw.nutriscore_grade) !== 'not-applicable'
        ? str(raw.nutriscore_grade)
        : undefined,
    novaGroup: num(raw.nova_group),
    ecoScore: str(raw.ecoscore_grade) || undefined,
    nutriments: toNutriments(raw.nutriments),
    servingSize: str(raw.serving_size) || undefined,
  };
}

interface OffProductResponse {
  status: number;
  product?: OffProduct;
}

async function fetchFrom(kind: ProductKind, barcode: string): Promise<Product | null> {
  const url = `${HOSTS[kind]}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${PRODUCT_FIELDS}`;
  const data = await getJson<OffProductResponse>(url);
  if (data.status !== 1 || !data.product) return null;
  return normalise(data.product, barcode, kind);
}

/**
 * Look a barcode up. A barcode alone doesn't say whether it is food or shampoo,
 * so we race both databases and take whichever has a real record — food wins ties
 * because it is the far larger set.
 */
export async function fetchProduct(barcode: string, preferred?: ProductKind): Promise<Product> {
  const cacheKey = `product/${barcode}`;
  const cached = await readCache<Product>(cacheKey);
  if (cached) return cached;

  const order: ProductKind[] = preferred === 'cosmetic' ? ['cosmetic', 'food'] : ['food', 'cosmetic'];
  const results = await Promise.allSettled(order.map((kind) => fetchFrom(kind, barcode)));

  let found: Product | null = null;
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      found = result.value;
      break;
    }
  }

  if (!found) {
    const allFailed = results.every((r) => r.status === 'rejected');
    if (allFailed) throw new NetworkError();
    throw new ProductNotFoundError(barcode);
  }

  await writeCache(cacheKey, found);
  return found;
}

interface OffSearchResponse {
  count?: number;
  /** Legacy `cgi/search.pl` and `api/v2/search` shape. */
  products?: OffProduct[];
  /** Search-a-licious (`search.openfoodfacts.org`) shape. */
  hits?: OffProduct[];
}

function toHit(raw: OffProduct, kind: ProductKind): SearchHit {
  return {
    barcode: str(raw.code),
    name: (str(raw.product_name_en) || str(raw.product_name)).trim() || 'Unnamed product',
    brand: firstBrand(raw.brands),
    imageUrl: str(raw.image_front_small_url) || str(raw.image_front_url) || undefined,
    kind,
    nutriScore: str(raw.nutriscore_grade) || undefined,
    novaGroup: num(raw.nova_group),
  };
}

/** Try each URL in turn; the search hosts fail independently under load. */
async function firstSuccessfulSearch(urls: string[], kind: ProductKind): Promise<SearchHit[]> {
  let lastError: unknown = null;
  for (const url of urls) {
    try {
      const data = await getJson<OffSearchResponse>(url, 0);
      const raw = data.products ?? data.hits ?? [];
      const hits = raw.filter((p) => p.code).map((p) => toHit(p, kind));
      if (hits.length) return hits;
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError) throw lastError;
  return [];
}

/**
 * Keyword search. Search is rate limited harder than product reads (~10 req/min),
 * so results are cached and the legacy endpoint is tried first because it answers
 * in under a second — Search-a-licious has better relevance but can take 8s.
 */
export async function searchProducts(
  query: string,
  kind: ProductKind = 'food',
  pageSize = 24,
): Promise<SearchHit[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const cacheKey = `search/${kind}/${term.toLowerCase()}/${pageSize}`;
  const cached = await readCache<SearchHit[]>(cacheKey);
  if (cached) return cached;

  const encoded = encodeURIComponent(term);
  const urls = [
    `${HOSTS[kind]}/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process` +
      `&json=1&page_size=${pageSize}&fields=${SEARCH_FIELDS}`,
    ...(kind === 'food'
      ? [
          `https://search.openfoodfacts.org/search?q=${encoded}&page_size=${pageSize}` +
            `&fields=${SEARCH_FIELDS}`,
        ]
      : []),
  ];

  const hits = await firstSuccessfulSearch(urls, kind);
  if (hits.length) await writeCache(cacheKey, hits);
  return hits;
}

/**
 * "Smarter swaps" — pull popular products from the same category so the scoring
 * engine can rank genuinely cleaner options against what was just scanned.
 */
export async function fetchCategoryCandidates(
  category: string,
  kind: ProductKind,
  pageSize = 24,
): Promise<SearchHit[]> {
  const cacheKey = `category/${kind}/${category}/${pageSize}`;
  const cached = await readCache<SearchHit[]>(cacheKey);
  if (cached) return cached;

  const encoded = encodeURIComponent(category);
  const urls = [
    `${HOSTS[kind]}/cgi/search.pl?action=process&tagtype_0=categories&tag_contains_0=contains` +
      `&tag_0=${encoded}&sort_by=unique_scans_n&page_size=${pageSize}&json=1&fields=${SEARCH_FIELDS}`,
    `${HOSTS[kind]}/api/v2/search?categories_tags_en=${encoded}&page_size=${pageSize}&fields=${SEARCH_FIELDS}`,
  ];

  let hits: SearchHit[] = [];
  try {
    hits = await firstSuccessfulSearch(urls, kind);
  } catch {
    return []; // Swaps are a nice-to-have — never fail the product screen over them.
  }
  if (hits.length) await writeCache(cacheKey, hits);
  return hits;
}

/** Full record for a list of barcodes, used to score swap candidates. */
export async function fetchProducts(barcodes: string[], kind: ProductKind): Promise<Product[]> {
  const settled = await Promise.allSettled(barcodes.map((code) => fetchProduct(code, kind)));
  return settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
}

export async function clearProductCache(): Promise<void> {
  memoryCache.clear();
  const keys = await AsyncStorage.getAllKeys();
  const ours = keys.filter((k) => k.startsWith(CACHE_PREFIX));
  if (ours.length) await AsyncStorage.multiRemove(ours);
}
