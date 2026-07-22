import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchProduct } from '@/src/api/openFacts';
import { NetworkError, Product, ProductNotFoundError } from '@/src/api/types';
import { Assessment, assess } from '@/src/scoring/engine';
import { useAppState } from '@/src/store/AppState';

type Status = 'idle' | 'loading' | 'ready' | 'not-found' | 'error';

export function useProduct(barcode: string | undefined) {
  const { prefs, recordScan, hydrated } = useAppState();
  const [product, setProduct] = useState<Product | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!barcode) return;
    let cancelled = false;
    setStatus('loading');
    setError(null);

    fetchProduct(barcode)
      .then((p) => {
        if (cancelled) return;
        setProduct(p);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setProduct(null);
        if (err instanceof ProductNotFoundError) {
          setStatus('not-found');
        } else {
          setStatus('error');
          setError(err instanceof NetworkError ? err.message : 'Something went wrong.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [barcode, attempt]);

  const assessment: Assessment | null = useMemo(
    () => (product ? assess(product, prefs) : null),
    [product, prefs],
  );

  // Log the scan once we know what it is — history rows show the personalised score.
  useEffect(() => {
    if (hydrated && product && assessment) recordScan(product, assessment.score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.barcode, hydrated]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return { product, assessment, status, error, retry };
}
