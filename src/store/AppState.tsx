/**
 * Single persisted app store: onboarding status, dietary preferences, scan
 * history and saved products. Backed by AsyncStorage, hydrated once on boot.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Product, ProductKind } from '@/src/api/types';
import { Preferences } from '@/src/scoring/engine';

export interface HistoryEntry {
  barcode: string;
  name: string;
  brand: string;
  imageUrl?: string;
  kind: ProductKind;
  score: number;
  scannedAt: number;
}

interface PersistedState {
  onboarded: boolean;
  name: string;
  prefs: Preferences;
  history: HistoryEntry[];
  saved: HistoryEntry[];
}

const STORAGE_KEY = '@olive/state/v1';
const HISTORY_LIMIT = 200;

const DEFAULT_STATE: PersistedState = {
  onboarded: false,
  name: '',
  prefs: { diets: [], avoid: [] },
  history: [],
  saved: [],
};

interface AppStateValue extends PersistedState {
  hydrated: boolean;
  setName: (name: string) => void;
  setPrefs: (prefs: Preferences) => void;
  toggleDiet: (id: string) => void;
  toggleAvoid: (id: string) => void;
  completeOnboarding: () => void;
  recordScan: (product: Product, score: number) => void;
  toggleSaved: (product: Product, score: number) => void;
  isSaved: (barcode: string) => boolean;
  clearHistory: () => void;
  resetAll: () => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) {
          const parsed = JSON.parse(raw) as Partial<PersistedState>;
          setState({ ...DEFAULT_STATE, ...parsed, prefs: { ...DEFAULT_STATE.prefs, ...parsed.prefs } });
        }
      } catch {
        // Corrupt storage falls back to defaults rather than crashing the app.
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, hydrated]);

  const toEntry = (product: Product, score: number): HistoryEntry => ({
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    imageUrl: product.imageUrl,
    kind: product.kind,
    score,
    scannedAt: Date.now(),
  });

  const setName = useCallback((name: string) => setState((s) => ({ ...s, name })), []);
  const setPrefs = useCallback((prefs: Preferences) => setState((s) => ({ ...s, prefs })), []);

  const toggleIn = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const toggleDiet = useCallback(
    (id: string) =>
      setState((s) => ({ ...s, prefs: { ...s.prefs, diets: toggleIn(s.prefs.diets, id) } })),
    [],
  );

  const toggleAvoid = useCallback(
    (id: string) =>
      setState((s) => ({ ...s, prefs: { ...s.prefs, avoid: toggleIn(s.prefs.avoid, id) } })),
    [],
  );

  const completeOnboarding = useCallback(() => setState((s) => ({ ...s, onboarded: true })), []);

  const recordScan = useCallback((product: Product, score: number) => {
    setState((s) => {
      const entry = toEntry(product, score);
      const rest = s.history.filter((h) => h.barcode !== entry.barcode);
      return { ...s, history: [entry, ...rest].slice(0, HISTORY_LIMIT) };
    });
  }, []);

  const toggleSaved = useCallback((product: Product, score: number) => {
    setState((s) => {
      const exists = s.saved.some((h) => h.barcode === product.barcode);
      return {
        ...s,
        saved: exists
          ? s.saved.filter((h) => h.barcode !== product.barcode)
          : [toEntry(product, score), ...s.saved],
      };
    });
  }, []);

  const clearHistory = useCallback(() => setState((s) => ({ ...s, history: [] })), []);
  const resetAll = useCallback(() => setState(DEFAULT_STATE), []);

  const isSaved = useCallback(
    (barcode: string) => state.saved.some((h) => h.barcode === barcode),
    [state.saved],
  );

  const value = useMemo<AppStateValue>(
    () => ({
      ...state,
      hydrated,
      setName,
      setPrefs,
      toggleDiet,
      toggleAvoid,
      completeOnboarding,
      recordScan,
      toggleSaved,
      isSaved,
      clearHistory,
      resetAll,
    }),
    [
      state,
      hydrated,
      setName,
      setPrefs,
      toggleDiet,
      toggleAvoid,
      completeOnboarding,
      recordScan,
      toggleSaved,
      isSaved,
      clearHistory,
      resetAll,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside <AppStateProvider>');
  return ctx;
}
