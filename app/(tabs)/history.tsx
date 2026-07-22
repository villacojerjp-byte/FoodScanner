import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/src/components/Card';
import { EmptyState } from '@/src/components/EmptyState';
import { ProductRow } from '@/src/components/ProductRow';
import { Text } from '@/src/components/Text';
import { HistoryEntry, useAppState } from '@/src/store/AppState';
import { colors, radius, spacing } from '@/src/theme';

type Tab = 'recent' | 'saved';

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

/** Group entries under Today / Yesterday / Earlier headings. */
function groupByDay(entries: HistoryEntry[]) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();
  const yesterday = today - 24 * 60 * 60 * 1000;

  const groups: { title: string; items: HistoryEntry[] }[] = [
    { title: 'Today', items: [] },
    { title: 'Yesterday', items: [] },
    { title: 'Earlier', items: [] },
  ];
  for (const e of entries) {
    if (e.scannedAt >= today) groups[0].items.push(e);
    else if (e.scannedAt >= yesterday) groups[1].items.push(e);
    else groups[2].items.push(e);
  }
  return groups.filter((g) => g.items.length > 0);
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { history, saved, clearHistory } = useAppState();
  const [tab, setTab] = useState<Tab>('recent');

  const entries = tab === 'recent' ? history : saved;
  const groups = useMemo(() => groupByDay(entries), [entries]);

  const average = useMemo(
    () =>
      entries.length
        ? Math.round(entries.reduce((sum, e) => sum + e.score, 0) / entries.length)
        : null,
    [entries],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + spacing.sm }}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text variant="title">Your scans</Text>
            <Text variant="small" tone="muted" style={{ marginTop: 2 }}>
              {entries.length} product{entries.length === 1 ? '' : 's'}
              {average !== null ? ` · ${average} average score` : ''}
            </Text>
          </View>
          {tab === 'recent' && history.length > 0 && (
            <Pressable onPress={clearHistory} hitSlop={8} accessibilityRole="button">
              <Text variant="small" color={colors.avoid}>
                Clear
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.segment}>
          {(['recent', 'saved'] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
              style={[styles.segmentItem, tab === t && styles.segmentActive]}
            >
              <Text variant="small" color={tab === t ? colors.olive : colors.textMuted}>
                {t === 'recent' ? 'Recent' : `Saved (${saved.length})`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {entries.length === 0 ? (
          <EmptyState
            icon={tab === 'recent' ? 'time-outline' : 'bookmark-outline'}
            title={tab === 'recent' ? 'No scans yet' : 'Nothing saved yet'}
            message={
              tab === 'recent'
                ? 'Everything you scan lands here so you can compare over time.'
                : 'Tap the bookmark on a product to keep it here.'
            }
            actionLabel="Open scanner"
            onAction={() => router.push('/scan')}
          />
        ) : (
          groups.map((group) => (
            <View key={group.title} style={{ marginBottom: spacing.lg }}>
              <Text variant="caption" tone="muted" uppercase style={{ marginBottom: spacing.xs }}>
                {group.title}
              </Text>
              <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
                {group.items.map((e, i) => (
                  <View key={`${e.barcode}-${e.scannedAt}`} style={i > 0 ? styles.divider : undefined}>
                    <ProductRow
                      name={e.name}
                      brand={e.brand}
                      imageUrl={e.imageUrl}
                      score={e.score}
                      meta={relativeTime(e.scannedAt)}
                      onPress={() =>
                        router.push({ pathname: '/product/[barcode]', params: { barcode: e.barcode } })
                      }
                    />
                  </View>
                ))}
              </Card>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  segment: {
    flexDirection: 'row',
    marginTop: spacing.md,
    backgroundColor: colors.bgAlt,
    borderRadius: radius.pill,
    padding: 3,
  },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.pill },
  segmentActive: { backgroundColor: colors.surface },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
