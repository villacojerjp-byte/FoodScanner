import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { searchProducts } from '@/src/api/openFacts';
import { ProductKind, SearchHit } from '@/src/api/types';
import { Card, SectionHeader } from '@/src/components/Card';
import { EmptyState } from '@/src/components/EmptyState';
import { ProductRow } from '@/src/components/ProductRow';
import { ScoreBadge } from '@/src/components/ScoreBadge';
import { Text } from '@/src/components/Text';
import { quickScore } from '@/src/scoring/engine';
import { colors, radius, spacing } from '@/src/theme';

const SUGGESTIONS: Record<ProductKind, string[]> = {
  food: ['Oat milk', 'Peanut butter', 'Greek yogurt', 'Granola bar', 'Olive oil', 'Tortilla chips'],
  cosmetic: ['Shampoo', 'Sunscreen', 'Moisturiser', 'Deodorant', 'Body wash', 'Lip balm'],
};

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<ProductKind>('food');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(async (term: string, k: ProductKind) => {
    if (term.trim().length < 2) {
      setResults([]);
      setSearched(false);
      setFailed(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      const hits = await searchProducts(term, k);
      setResults(hits);
    } catch {
      // The search hosts are rate limited and 503 under load — say so rather
      // than claiming the query had no matches.
      setResults([]);
      setFailed(true);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, []);

  // Search is rate limited to ~10 req/min, so debounce generously.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => run(query, kind), 550);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, kind, run]);

  const open = (hit: SearchHit) =>
    router.push({ pathname: '/product/[barcode]', params: { barcode: hit.barcode } });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + spacing.sm }}>
      <View style={styles.header}>
        <Text variant="title">Search</Text>
        <Text variant="small" tone="muted" style={{ marginTop: 2 }}>
          Look something up before you buy it.
        </Text>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={kind === 'food' ? 'Search food & drink' : 'Search skincare & cosmetics'}
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => run(query, kind)}
            accessibilityLabel="Search products"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={colors.textFaint} />
            </Pressable>
          )}
        </View>

        <View style={styles.segment}>
          {(['food', 'cosmetic'] as ProductKind[]).map((k) => (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              accessibilityRole="tab"
              accessibilityState={{ selected: kind === k }}
              style={[styles.segmentItem, kind === k && styles.segmentActive]}
            >
              <Text variant="small" color={kind === k ? colors.olive : colors.textMuted}>
                {k === 'food' ? 'Food & drink' : 'Cosmetics'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator color={colors.olive} />
          </View>
        )}

        {!loading && !searched && (
          <>
            <SectionHeader title="Try one of these" />
            <View style={styles.suggestWrap}>
              {SUGGESTIONS[kind].map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setQuery(s)}
                  style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.7 }]}
                  accessibilityRole="button"
                >
                  <Text variant="small">{s}</Text>
                </Pressable>
              ))}
            </View>

            <Card flat style={{ marginTop: spacing.xl }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
                <Ionicons name="bulb-outline" size={18} color={colors.oliveMid} />
                <Text variant="small" tone="muted" style={{ flex: 1 }}>
                  Search matches product names in Open Food Facts. Scanning a barcode is always more
                  accurate — it resolves the exact package.
                </Text>
              </View>
            </Card>
          </>
        )}

        {!loading && searched && results.length === 0 && (
          <EmptyState
            icon={failed ? 'cloud-offline-outline' : 'search-outline'}
            title={failed ? 'Search is busy' : 'No matches'}
            message={
              failed
                ? 'Open Food Facts limits searches to about ten a minute and is rate limiting us. Scanning a barcode still works.'
                : `Nothing found for "${query}". Try a broader term, or scan the barcode directly.`
            }
            actionLabel={failed ? 'Try again' : 'Open scanner'}
            onAction={failed ? () => run(query, kind) : () => router.push('/scan')}
          />
        )}

        {!loading && results.length > 0 && (
          <>
            <Text variant="caption" tone="muted" uppercase style={{ marginBottom: spacing.xs }}>
              {results.length} results
            </Text>
            <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
              {results.map((hit, i) => (
                <View key={hit.barcode} style={i > 0 ? styles.divider : undefined}>
                  <ProductRow
                    name={hit.name}
                    brand={hit.brand}
                    imageUrl={hit.imageUrl}
                    onPress={() => open(hit)}
                    right={
                      hit.nutriScore || hit.novaGroup ? (
                        <ScoreBadge score={quickScore(hit.nutriScore, hit.novaGroup)} />
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                      )
                    }
                  />
                </View>
              ))}
            </Card>
            <Text variant="small" tone="faint" center style={{ marginTop: spacing.md }}>
              Estimated scores shown. Open a product for the full personalised analysis.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    height: 48,
  },
  input: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.text },
  segment: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    backgroundColor: colors.bgAlt,
    borderRadius: radius.pill,
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  segmentActive: { backgroundColor: colors.surface },
  suggestWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  suggestion: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
