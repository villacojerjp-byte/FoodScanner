# Food & Cosmetic Scanner API — Reference

A guide to the API that powers holistic food/cosmetic scanner apps like
**Olive – Holistic Food Scanner** and **Fig – Food Scanner & Guide**, and how to
use the same kind of API to build your own.

---

## 1. TL;DR

- The commercial apps (Olive, Fig, Yuka…) run **private, auth-gated backends** you
  cannot call from your own app.
- What they are actually built **on top of** is the free, open **Open Food Facts**
  database (and its sibling **Open Beauty Facts** for cosmetics/skincare). They add
  their own "holistic" scoring layer on top.
- **Use this to build your own scanner — no API key, free, barcode → ingredients:**

  ```
  GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json      # food
  GET https://world.openbeautyfacts.org/api/v2/product/{barcode}.json    # cosmetics
  ```

---

## 2. What I found about the actual apps' backends

I probed the real infrastructure behind both apps. Their own APIs are **private and
not usable by third parties** — documented here so you know why you can't just call them.

### Olive – Holistic Food Scanner
- **Developer:** Giga Studios, Inc — <https://www.oliveapp.com>
- **iOS:** `id6739765789` · **Android:** `com.gigastudios.oliveapp`
- Marketing site (`oliveapp.com`) and `api.oliveapp.com` are **Next.js on Vercel**
  behind Cloudflare — `api.oliveapp.com` is just a placeholder page, not the real API.
- Onboarding funnel lives at `quiz.oliveapp.com`; telehealth is via `openloophealth.com`.
- The **real mobile backend is private** (not exposed on a guessable subdomain, auth-gated).
- Advertises "1M+ food, cosmetic, skincare & personal-care products" and flags additives,
  seed oils, gluten, pesticides, parabens, phthalates, fragrance — i.e. the exact fields
  Open Food Facts / Open Beauty Facts expose.

### Fig – Food Scanner & Guide
- **Developer:** Food is Good, Inc — <https://foodisgood.com>
- **iOS:** `id1564434726` · **Android:** `com.fig`
- Marketing site is Next.js on Vercel.
- Real API host: **`api.foodisgood.com`** — a **NestJS** service fronted by **AWS API
  Gateway** (`x-amz-apigw-id`, NestJS `{"statusCode":404,"error":"Not Found"}` bodies).
- Every data endpoint returns **`403 Forbidden`** without the app's auth token — **private.**

**Bottom line:** neither app offers a public API. To build a comparable app, use the
open database they (and most competitors) rely on. That's the rest of this doc.

---

## 3. Primary recommended API — Open Food Facts / Open Beauty Facts

Free, open-data, **no API key**, community-run ("the Wikipedia of food"). Covers both
food and cosmetics — perfect for an Olive-style "holistic" scanner.

| Category | Base host | Products |
|---|---|---|
| Food & drink | `https://world.openfoodfacts.org` | ~3.5M |
| Cosmetics / skincare | `https://world.openbeautyfacts.org` | ~1M |
| Other products | `https://world.openproductsfacts.org` | — |
| Pet food | `https://world.openpetfoodfacts.org` | — |

### Rules of the road
- **No key required.** But you **must send a descriptive `User-Agent`** identifying your
  app, e.g. `MyScanner/1.0 (you@example.com)`. Generic UAs get rate-limited/blocked.
- **Rate limits (read):** ~100 req/min for product reads, ~10 req/min for search. Cache
  results; don't hammer it.
- **Staging** (for testing writes): replace `.org` with `.net`.
- **License:** data is **ODbL** — free to use commercially, but you must attribute
  Open Food Facts and share back improvements to the data.

### 3.1 Get a product by barcode (the scan endpoint)

```
GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json
```

Restrict payload with `?fields=` to keep responses small.

**Tested example — Nutella (`3017620422003`):**

```bash
curl -H 'User-Agent: MyScanner/1.0 (you@example.com)' \
  'https://world.openfoodfacts.org/api/v2/product/3017620422003.json?fields=code,product_name,brands,ingredients_text,nutriscore_grade,nova_group,additives_tags,allergens_tags'
```

```json
{
  "code": "3017620422003",
  "status": 1,
  "status_verbose": "product found",
  "product": {
    "product_name": "Nutella",
    "brands": "Nutella, Ferrero",
    "ingredients_text": "Sucre, huile de palme, NOISETTES 13%, cacao maigre 7,4%, LAIT écrémé en poudre 6,6% …",
    "nutriscore_grade": "e",
    "nova_group": 4,
    "additives_tags": ["en:e322", "en:e322i"],
    "allergens_tags": ["en:milk", "en:nuts", "en:soybeans"]
  }
}
```

`status: 0` / `"product not found"` means the barcode isn't in the DB yet.

### 3.2 Get a cosmetic by barcode (Open Beauty Facts)

```
GET https://world.openbeautyfacts.org/api/v2/product/{barcode}.json
```

**Tested example — Herbal Essences shampoo (`8001090662231`):** returns full INCI list:
`Aqua, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Sodium Lauryl Sulfate, Parfum,
Sodium Benzoate, Limonene, Linalool …` — everything you need to flag sulfates, parfum,
allergens, etc.

### 3.3 Search by text / filters

New engine (**Search-a-licious**), best for keyword search:

```bash
curl -H 'User-Agent: MyScanner/1.0 (you@example.com)' \
  'https://search.openfoodfacts.org/search?q=olive%20oil&page_size=20&fields=code,product_name,brands'
```

Legacy search (rich filters — additives, labels, categories, nutrient ranges):

```
GET https://world.openfoodfacts.org/cgi/search.pl?search_terms=oat+milk&json=1&page_size=20
```

### 3.4 Fields useful for a "holistic" scanner

| Field | Meaning |
|---|---|
| `ingredients_text`, `ingredients` | Full ingredient list (parsed array available) |
| `additives_tags` | E-numbers detected (e.g. `en:e322`) |
| `allergens_tags` | Allergens (milk, nuts, soy, gluten…) |
| `nutriscore_grade` | Nutri-Score A–E |
| `nova_group` | Processing level 1–4 (4 = ultra-processed) |
| `ingredients_analysis_tags` | vegan / vegetarian / palm-oil flags |
| `labels_tags` | Organic, gluten-free, etc. |
| `nutriments` | Per-100g fat, sugar, salt, protein… |
| `image_front_url` | Product photo |

Full docs: <https://openfoodfacts.github.io/openfoodfacts-server/api/>

---

## 4. Commercial alternatives (if you need SLAs, richer nutrition, or US-heavy coverage)

| API | Key? | Barcode | Cosmetics | Notes |
|---|---|---|---|---|
| **Nutritionix** | Yes | ✅ | ❌ | Strong US grocery + restaurant + NLP ("2 eggs and toast"). Free tier. |
| **Edamam Food DB** | Yes | ✅ | ❌ | Food + nutrition analysis. Free dev tier. |
| **USDA FoodData Central** | Yes (free) | ❌ (by name) | ❌ | Authoritative US gov nutrition data, totally free. |
| **Spoonacular** | Yes | ✅ | ❌ | Food + recipes; freemium. |
| **FatSecret Platform** | Yes (OAuth) | ✅ | ❌ | Large branded-food DB. |
| **Barcode Lookup / UPCitemdb** | Yes | ✅ | ✅ (generic) | Any-product barcode → name/brand, thin ingredient data. |
| **INCI Beauty / EWG** | Limited | — | ✅ | Cosmetic ingredient safety scoring (EWG has no open public API). |

For a food **+ cosmetic** scanner specifically, **Open Food Facts + Open Beauty Facts**
is the only single source that cleanly covers both — which is why apps like Olive lean on it.

---

## 5. Quick start — barcode → verdict

```javascript
// Works for food (openfoodfacts) and cosmetics (openbeautyfacts) — just swap the host.
async function scan(barcode, kind = "food") {
  const host = kind === "cosmetic"
    ? "https://world.openbeautyfacts.org"
    : "https://world.openfoodfacts.org";
  const fields = "product_name,brands,ingredients_text,additives_tags,allergens_tags,nutriscore_grade,nova_group";
  const res = await fetch(
    `${host}/api/v2/product/${barcode}.json?fields=${fields}`,
    { headers: { "User-Agent": "MyScanner/1.0 (you@example.com)" } }
  );
  const data = await res.json();
  if (data.status !== 1) return { found: false };

  const p = data.product;
  return {
    found: true,
    name: p.product_name,
    brand: p.brands,
    ingredients: p.ingredients_text,
    additives: p.additives_tags ?? [],
    allergens: p.allergens_tags ?? [],
    nutriScore: p.nutriscore_grade,
    ultraProcessed: p.nova_group === 4,
  };
}

// scan("3017620422003");              // Nutella (food)
// scan("8001090662231", "cosmetic");  // Herbal Essences (cosmetic)
```

---

## 6. Summary

- **Olive's / Fig's own APIs are private** — Fig runs a NestJS API behind AWS API Gateway
  at `api.foodisgood.com` (403 without auth); Olive's real backend isn't publicly exposed.
- **The API to actually use is Open Food Facts + Open Beauty Facts** — free, no key,
  barcode → ingredients/additives/allergens/scores, covering both food and cosmetics.
- Add your own "holistic" scoring rules on top (flag seed oils, parabens, additives, etc.)
  exactly like these apps do.

### Key links
- Open Food Facts API docs — <https://openfoodfacts.github.io/openfoodfacts-server/api/>
- Data & SDKs (Kotlin, Dart/Flutter, Python, JS) — <https://world.openfoodfacts.org/data>
- Open Beauty Facts — <https://world.openbeautyfacts.org>
- Olive — <https://www.oliveapp.com> · Fig — <https://foodisgood.com>
