import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, SectionHeader } from '@/src/components/Card';
import { Chip } from '@/src/components/Chip';
import { EmptyState } from '@/src/components/EmptyState';
import { ProductRow } from '@/src/components/ProductRow';
import { Text } from '@/src/components/Text';
import { AVOID_PREFERENCES, DIET_FLAGS } from '@/src/scoring/rules';
import { useAppState } from '@/src/store/AppState';
import { colors, radius, shadow, spacing, tierForScore, tierMeta } from '@/src/theme';

const LEARN = [
  {
    id: 'seed-oils',
    emoji: '🫗',
    title: 'Why seed oils get flagged',
    body: 'Canola, soybean and sunflower oil are solvent-extracted and heavy in omega-6.',
  },
  {
    id: 'nova',
    emoji: '🏭',
    title: 'What "ultra-processed" means',
    body: 'NOVA group 4 products are built from refined substances you would not cook with.',
  },
  {
    id: 'parfum',
    emoji: '🌸',
    title: '"Parfum" can hide 100+ chemicals',
    body: 'Fragrance is a trade secret, so the individual compounds never reach the label.',
  },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { name, history, prefs, saved } = useAppState();

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const week = history.filter((h) => h.scannedAt >= weekAgo);
    const avg = week.length
      ? Math.round(week.reduce((sum, h) => sum + h.score, 0) / week.length)
      : null;
    const clean = week.filter((h) => h.score >= 62).length;
    return { count: week.length, avg, clean };
  }, [history]);

  const activeFilters = [
    ...prefs.diets.map((id) => DIET_FLAGS.find((d) => d.id === id)).filter(Boolean),
    ...prefs.avoid.map((id) => AVOID_PREFERENCES.find((a) => a.id === id)).filter(Boolean),
  ] as { id: string; label: string; emoji: string }[];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="small" tone="muted">
            {greeting()}
            {name ? ',' : ''}
          </Text>
          <Text variant="title">{name || 'Welcome back'}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          style={styles.avatar}
        >
          <Text variant="h2" tone="brand">
            {(name || 'O').charAt(0).toUpperCase()}
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push('/scan')}
        accessibilityRole="button"
        accessibilityLabel="Scan a product"
        style={({ pressed }) => [styles.scanCard, pressed && { opacity: 0.92 }]}
      >
        <LinearGradient
          colors={[colors.olive, '#3E6B41', colors.oliveDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ flex: 1 }}>
          <Text variant="h1" tone="onDark">
            Scan a product
          </Text>
          <Text variant="small" tone="onDarkMuted" style={{ marginTop: 4, maxWidth: 210 }}>
            Point at any barcode — food, skincare or cosmetics.
          </Text>
        </View>
        <View style={styles.scanCircle}>
          <Ionicons name="scan" size={26} color={colors.oliveDeep} />
        </View>
      </Pressable>

      <View style={styles.statsRow}>
        <StatTile label="Scans this week" value={String(stats.count)} icon="barcode-outline" />
        <StatTile
          label="Average score"
          value={stats.avg === null ? '—' : String(stats.avg)}
          icon="speedometer-outline"
          color={stats.avg === null ? undefined : tierMeta[tierForScore(stats.avg)].color}
        />
        <StatTile label="Saved" value={String(saved.length)} icon="bookmark-outline" />
      </View>

      {activeFilters.length > 0 && (
        <View style={styles.block}>
          <SectionHeader
            title="Your filters"
            caption="Products breaking these are capped at a low score"
            action={
              <Pressable onPress={() => router.push('/(tabs)/profile')} hitSlop={8}>
                <Text variant="small" tone="brand">
                  Edit
                </Text>
              </Pressable>
            }
          />
          <View style={styles.chipWrap}>
            {activeFilters.map((f) => (
              <Chip key={f.id} label={f.label} emoji={f.emoji} size="sm" selected />
            ))}
          </View>
        </View>
      )}

      <View style={styles.block}>
        <SectionHeader
          title="Recent scans"
          action={
            history.length > 0 ? (
              <Pressable onPress={() => router.push('/(tabs)/history')} hitSlop={8}>
                <Text variant="small" tone="brand">
                  See all
                </Text>
              </Pressable>
            ) : undefined
          }
        />
        {history.length === 0 ? (
          <Card>
            <EmptyState
              icon="barcode-outline"
              title="Nothing scanned yet"
              message="Your first scan takes about three seconds. Try a jar from the cupboard."
              actionLabel="Open scanner"
              onAction={() => router.push('/scan')}
            />
          </Card>
        ) : (
          <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
            {history.slice(0, 5).map((h, i) => (
              <View key={h.barcode} style={i > 0 ? styles.divider : undefined}>
                <ProductRow
                  name={h.name}
                  brand={h.brand}
                  imageUrl={h.imageUrl}
                  score={h.score}
                  meta={h.kind === 'cosmetic' ? 'Cosmetic' : undefined}
                  onPress={() =>
                    router.push({ pathname: '/product/[barcode]', params: { barcode: h.barcode } })
                  }
                />
              </View>
            ))}
          </Card>
        )}
      </View>

      <View style={styles.block}>
        <SectionHeader title="Learn" caption="Short reads on what we flag and why" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {LEARN.map((item) => (
            <Card key={item.id} style={styles.learnCard}>
              <Text variant="h1">{item.emoji}</Text>
              <Text variant="bodyStrong" style={{ marginTop: spacing.xs }}>
                {item.title}
              </Text>
              <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
                {item.body}
              </Text>
            </Card>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

function StatTile({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
}) {
  return (
    <View style={styles.statTile}>
      <Ionicons name={icon} size={16} color={colors.textFaint} />
      <Text variant="title" color={color} style={{ marginTop: 2 }}>
        {value}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={2}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.oliveTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanCard: {
    marginHorizontal: spacing.md,
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    ...shadow.lifted,
  },
  scanCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  block: { marginTop: spacing.xl, paddingHorizontal: spacing.md },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  learnCard: { width: 220 },
});
