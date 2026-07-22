import { useEffect, useState } from 'react';

import { fetchCategoryCandidates, fetchProducts } from '@/src/api/openFacts';
import { Product } from '@/src/api/types';
import { Assessment, assess, quickScore } from '@/src/scoring/engine';
import { useAppState } from '@/src/store/AppState';

export interface Alternative {
  product: Product;
  assessment: Assessment;
}

const CANDIDATE_POOL = 24;
const DEEP_SCORED = 8;
const MIN_IMPROVEMENT = 6;

/**
 * Pick the most specific category tag. The last entry is usually the narrowest,
 * but Open Food Facts also stores untranslated values under the `en:` prefix
 * ("en:Pâtes à tartiner"), which make useless query terms — so require a clean
 * lowercase slug.
 */
function pickCategory(product: Product): string | undefined {
  const usable = product.categories.filter((c) => /^en:[a-z0-9-]{4,}$/.test(c));
  return usable[usable.length - 1]?.replace('en:', '');
}

const normaliseBrand = (brand: string) => brand.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * "Smarter swaps": pull popular products from the same category, pre-rank them
 * with the cheap Nutri-Score/NOVA heuristic, then fully score the best few
 * against the user's own preferences.
 */
export function useAlternatives(product: Product | null, currentScore: number | undefined) {
  const { prefs } = useAppState();
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!product || currentScore === undefined) return;
    const category = pickCategory(product);
    if (!category) {
      setAlternatives([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const hits = await fetchCategoryCandidates(category, product.kind, CANDIDATE_POOL);
        const ownBrand = normaliseBrand(product.brand);
        const shortlist = hits
          .filter((h) => h.barcode !== product.barcode)
          // A different size of the same product is not a swap.
          .filter((h) => !ownBrand || normaliseBrand(h.brand) !== ownBrand)
          .map((h) => ({ hit: h, guess: quickScore(h.nutriScore, h.novaGroup) }))
          .sort((a, b) => b.guess - a.guess)
          .slice(0, DEEP_SCORED)
          .map((x) => x.hit.barcode);

        if (!shortlist.length) {
          if (!cancelled) setAlternatives([]);
          return;
        }

        const full = await fetchProducts(shortlist, product.kind);
        if (cancelled) return;

        const scored = full
          .map((p) => ({ product: p, assessment: assess(p, prefs) }))
          .filter((a) => a.assessment.score >= currentScore + MIN_IMPROVEMENT)
          .filter((a) => !a.assessment.personalAlerts.length)
          .sort((a, b) => b.assessment.score - a.assessment.score)
          .slice(0, 5);

        setAlternatives(scored);
      } catch {
        if (!cancelled) setAlternatives([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [product, currentScore, prefs]);

  return { alternatives, loading };
}
