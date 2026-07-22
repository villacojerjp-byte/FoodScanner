import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ATTRIBUTION } from '@/src/api/openFacts';
import { Product } from '@/src/api/types';
import { Button } from '@/src/components/Button';
import { Card, SectionHeader } from '@/src/components/Card';
import { Chip } from '@/src/components/Chip';
import { EmptyState } from '@/src/components/EmptyState';
import { FlagRow } from '@/src/components/FlagRow';
import { ProductRow } from '@/src/components/ProductRow';
import { ScoreRing } from '@/src/components/ScoreRing';
import { Text } from '@/src/components/Text';
import { useAlternatives } from '@/src/hooks/useAlternatives';
import { useProduct } from '@/src/hooks/useProduct';
import { Assessment, prettyTag } from '@/src/scoring/engine';
import { INGREDIENT_RULES, Severity } from '@/src/scoring/rules';
import { useAppState } from '@/src/store/AppState';
import { colors, radius, shadow, spacing, tierMeta } from '@/src/theme';

export default function ProductScreen() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { product, assessment, status, error, retry } = useProduct(barcode);
  const { toggleSaved, isSaved } = useAppState();

  if (status === 'loading' || status === 'idle') {
    return (
      <View style={styles.fill}>
        <ActivityIndicator color={colors.olive} size="large" />
        <Text variant="small" tone="muted" style={{ marginTop: spacing.sm }}>
          Reading the label…
        </Text>
      </View>
    );
  }

  if (status === 'not-found') {
    return (
      <View style={[styles.fill, { paddingTop: insets.top }]}>
        <EmptyState
          icon="help-circle-outline"
          title="Not in the database yet"
          message={`Barcode ${barcode} isn't in Open Food Facts or Open Beauty Facts. The database is community-run — you can add it and help the next person.`}
          actionLabel="Scan something else"
          onAction={() => router.replace('/scan')}
        />
        <Button label="Back" variant="ghost" onPress={() => router.replace('/(tabs)')} />
      </View>
    );
  }

  if (status === 'error' || !product || !assessment) {
    return (
      <View style={[styles.fill, { paddingTop: insets.top }]}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load that"
          message={error ?? 'Check your connection and try again.'}
          actionLabel="Try again"
          onAction={retry}
        />
        <Button label="Back" variant="ghost" onPress={() => router.replace('/(tabs)')} />
      </View>
    );
  }

  const saved = isSaved(product.barcode);
  const meta = tierMeta[assessment.tier];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <Hero product={product} assessment={assessment} />

        <View style={styles.body}>
          <View style={styles.verdict}>
            <ScoreRing score={assessment.score} tier={assessment.tier} />
            <View style={{ flex: 1 }}>
              <View style={[styles.tierPill, { backgroundColor: meta.tint }]}>
                <Text variant="caption" color={meta.color} uppercase>
                  {meta.label}
                </Text>
              </View>
              <Text variant="h1" style={{ marginTop: spacing.xs }}>
                {meta.blurb}
              </Text>
              <Text variant="small" tone="muted" style={{ marginTop: spacing.xxs }}>
                {assessment.concerns.length} concern
                {assessment.concerns.length === 1 ? '' : 's'} · {assessment.positives.length} positive
                {assessment.positives.length === 1 ? '' : 's'}
              </Text>
            </View>
          </View>

          {assessment.personalAlerts.length > 0 && (
            <View style={styles.alertBanner}>
              <Ionicons name="alert-circle" size={20} color={colors.avoid} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" color={colors.avoid}>
                  Breaks your own rules
                </Text>
                <Text variant="small" tone="muted" style={{ marginTop: 2 }}>
                  {assessment.personalAlerts.map((f) => f.title).join(' · ')}
                </Text>
              </View>
            </View>
          )}

          {product.kind === 'food' && <Breakdown assessment={assessment} />}

          {assessment.concerns.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="What we flagged" caption="Ranked by how much it costs the score" />
              <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
                {assessment.concerns.map((flag, i) => (
                  <View key={flag.id} style={i > 0 ? styles.divider : undefined}>
                    <FlagRow flag={flag} />
                  </View>
                ))}
              </Card>
            </View>
          )}

          {assessment.positives.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="What's good" />
              <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
                {assessment.positives.map((flag, i) => (
                  <View key={flag.id} style={i > 0 ? styles.divider : undefined}>
                    <FlagRow flag={flag} />
                  </View>
                ))}
              </Card>
            </View>
          )}

          <Ingredients product={product} />
          {product.kind === 'food' && <NutritionTable product={product} />}
          <Swaps product={product} score={assessment.score} />
          <Labels product={product} />

          <View style={styles.section}>
            <Card flat>
              <Text variant="small" tone="muted">
                {ATTRIBUTION} Barcode {product.barcode}. Scores are generated by Olive Scan&apos;s own
                rules from open data — informational only, not medical advice.
              </Text>
            </Card>
          </View>
        </View>
      </ScrollView>

      {/* Content scrolls under the controls, so blur the strip to keep them legible. */}
      <BlurView
        intensity={28}
        tint="light"
        style={[styles.topScrim, { height: insets.top + 52 }]}
        pointerEvents="none"
      />

      <View style={[styles.floatingBar, { top: insets.top + spacing.xs }]}>
        <RoundIcon icon="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <RoundIcon
            icon={saved ? 'bookmark' : 'bookmark-outline'}
            label={saved ? 'Remove from saved' : 'Save product'}
            active={saved}
            onPress={() => toggleSaved(product, assessment.score)}
          />
          <Link href="/scan" asChild>
            <Pressable style={styles.roundIcon} accessibilityRole="button" accessibilityLabel="Scan another">
              <Ionicons name="scan" size={18} color={colors.text} />
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

/** Own-brand products often repeat the name as the brand ("Nutella · Nutella"). */
function subtitleFor(product: Product): string {
  const same = product.brand.toLowerCase().trim() === product.name.toLowerCase().trim();
  const brand = same ? '' : product.brand;
  const parts = [brand, product.quantity].filter(Boolean);
  return parts.length ? parts.join(' · ') : same ? '' : 'Unknown brand';
}

function Hero({ product, assessment }: { product: Product; assessment: Assessment }) {
  const insets = useSafeAreaInsets();
  const meta = tierMeta[assessment.tier];
  return (
    <View style={[styles.hero, { paddingTop: insets.top + 56 }]}>
      <LinearGradient
        colors={[meta.tint, colors.bg]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.heroImageWrap}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.heroImage} contentFit="contain" transition={220} />
        ) : (
          <Ionicons name={product.kind === 'cosmetic' ? 'color-palette-outline' : 'nutrition-outline'} size={44} color={colors.textFaint} />
        )}
      </View>
      <Text variant="title" center style={{ marginTop: spacing.md }}>
        {product.name}
      </Text>
      <Text variant="body" tone="muted" center style={{ marginTop: 2 }}>
        {subtitleFor(product)}
      </Text>
      <View style={styles.kindPill}>
        <Ionicons
          name={product.kind === 'cosmetic' ? 'sparkles-outline' : 'restaurant-outline'}
          size={12}
          color={colors.olive}
        />
        <Text variant="caption" tone="brand" uppercase>
          {product.kind === 'cosmetic' ? 'Cosmetic' : 'Food'}
        </Text>
      </View>
    </View>
  );
}

function Breakdown({ assessment }: { assessment: Assessment }) {
  const toneColor = { good: colors.excellent, warn: colors.moderate, bad: colors.avoid, neutral: colors.textMuted };
  return (
    <View style={styles.section}>
      <Card padded={false} style={{ paddingVertical: spacing.sm }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breakdownRow}>
          {assessment.breakdown.map((item) => (
            <View key={item.label} style={styles.breakdownCell}>
              <Text variant="caption" tone="muted" uppercase>
                {item.label}
              </Text>
              <Text variant="h2" color={toneColor[item.tone]} style={{ marginTop: 2 }}>
                {item.value}
              </Text>
            </View>
          ))}
        </ScrollView>
      </Card>
    </View>
  );
}

/** Colour each ingredient by the harshest rule it trips, so the list scans fast. */
function ingredientTone(ingredient: string, kind: Product['kind']): Severity | null {
  const rank: Record<Severity, number> = { high: 0, medium: 1, low: 2, positive: 3 };
  let worst: Severity | null = null;
  for (const rule of INGREDIENT_RULES) {
    if (!rule.appliesTo.includes(kind)) continue;
    if (!rule.patterns.test(ingredient)) continue;
    if (!worst || rank[rule.severity] < rank[worst]) worst = rule.severity;
  }
  return worst;
}

function Ingredients({ product }: { product: Product }) {
  const [expanded, setExpanded] = useState(false);
  const list = product.ingredientList;
  const shown = expanded ? list : list.slice(0, 12);

  const tone: Record<Severity, { bg: string; fg: string }> = {
    high: { bg: colors.avoidTint, fg: colors.avoid },
    medium: { bg: colors.poorTint, fg: colors.poor },
    low: { bg: colors.moderateTint, fg: colors.moderate },
    positive: { bg: colors.excellentTint, fg: colors.excellent },
  };

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Ingredients"
        caption={list.length ? `${list.length} listed · flagged ones are coloured` : undefined}
      />
      <Card>
        {list.length === 0 ? (
          <Text variant="small" tone="muted">
            No ingredient list on file for this product. Open Food Facts is community-edited — the
            data may be added later.
          </Text>
        ) : (
          <>
            <View style={styles.ingredientWrap}>
              {shown.map((ing, i) => {
                const sev = ingredientTone(ing, product.kind);
                const t = sev ? tone[sev] : { bg: colors.surfaceSunken, fg: colors.textMuted };
                return (
                  <View key={`${ing}-${i}`} style={[styles.ingredientPill, { backgroundColor: t.bg }]}>
                    <Text variant="small" color={t.fg} numberOfLines={1}>
                      {ing}
                    </Text>
                  </View>
                );
              })}
            </View>
            {list.length > 12 && (
              <Pressable onPress={() => setExpanded((e) => !e)} style={{ marginTop: spacing.sm }}>
                <Text variant="small" tone="brand">
                  {expanded ? 'Show fewer' : `Show all ${list.length} ingredients`}
                </Text>
              </Pressable>
            )}
          </>
        )}
      </Card>
    </View>
  );
}

function NutritionTable({ product }: { product: Product }) {
  const rows: [string, number | undefined, string][] = [
    ['Energy', product.nutriments.energyKcal, 'kcal'],
    ['Fat', product.nutriments.fat, 'g'],
    ['  of which saturates', product.nutriments.saturatedFat, 'g'],
    ['Carbohydrates', product.nutriments.carbohydrates, 'g'],
    ['  of which sugars', product.nutriments.sugars, 'g'],
    ['Fibre', product.nutriments.fiber, 'g'],
    ['Protein', product.nutriments.proteins, 'g'],
    ['Salt', product.nutriments.salt, 'g'],
  ].filter(([, v]) => v !== undefined) as [string, number, string][];

  if (!rows.length) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Nutrition" caption="Per 100 g / 100 ml" />
      <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
        {rows.map(([label, value, unit], i) => (
          <View key={label} style={[styles.nutriRow, i > 0 && styles.divider]}>
            <Text variant={label.startsWith('  ') ? 'small' : 'body'} tone={label.startsWith('  ') ? 'muted' : 'default'} style={{ flex: 1 }}>
              {label.trim()}
            </Text>
            <Text variant="bodyStrong">
              {value!.toFixed(value! < 10 ? 1 : 0)} {unit}
            </Text>
          </View>
        ))}
      </Card>
    </View>
  );
}

function Swaps({ product, score }: { product: Product; score: number }) {
  const router = useRouter();
  const { alternatives, loading } = useAlternatives(product, score);

  if (!loading && alternatives.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Smarter swaps" caption="Cleaner options from the same category" />
      <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
        {loading ? (
          <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
            <ActivityIndicator color={colors.olive} />
            <Text variant="small" tone="muted" style={{ marginTop: spacing.xs }}>
              Comparing the aisle…
            </Text>
          </View>
        ) : (
          alternatives.map((alt, i) => (
            <View key={alt.product.barcode} style={i > 0 ? styles.divider : undefined}>
              <ProductRow
                name={alt.product.name}
                brand={alt.product.brand}
                imageUrl={alt.product.imageUrl}
                score={alt.assessment.score}
                meta={`+${alt.assessment.score - score} vs this`}
                onPress={() =>
                  router.push({ pathname: '/product/[barcode]', params: { barcode: alt.product.barcode } })
                }
              />
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

function Labels({ product }: { product: Product }) {
  const labels = useMemo(
    () => product.labels.filter((l) => l.startsWith('en:')).slice(0, 10),
    [product.labels],
  );
  const allergens = useMemo(
    () => product.allergens.filter((a) => a.startsWith('en:')).slice(0, 10),
    [product.allergens],
  );
  if (!labels.length && !allergens.length) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="On the label" />
      <Card>
        {allergens.length > 0 && (
          <>
            <Text variant="caption" tone="muted" uppercase>
              Declared allergens
            </Text>
            <View style={[styles.ingredientWrap, { marginTop: spacing.xs }]}>
              {allergens.map((a) => (
                <View key={a} style={[styles.ingredientPill, { backgroundColor: colors.poorTint }]}>
                  <Text variant="small" color={colors.poor}>
                    {prettyTag(a)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
        {labels.length > 0 && (
          <>
            <Text variant="caption" tone="muted" uppercase style={{ marginTop: allergens.length ? spacing.md : 0 }}>
              Certifications & claims
            </Text>
            <View style={[styles.ingredientWrap, { marginTop: spacing.xs }]}>
              {labels.map((l) => (
                <Chip key={l} label={prettyTag(l)} size="sm" />
              ))}
            </View>
          </>
        )}
      </Card>
    </View>
  );
}

function RoundIcon({
  icon,
  label,
  onPress,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.roundIcon, pressed && { opacity: 0.65 }]}
    >
      <Ionicons name={icon} size={18} color={active ? colors.olive : colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  hero: { alignItems: 'center', paddingBottom: spacing.lg, paddingHorizontal: spacing.lg },
  heroImageWrap: {
    width: 150,
    height: 150,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  heroImage: { width: '86%', height: '86%' },
  kindPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.oliveTint,
  },
  body: { paddingHorizontal: spacing.md },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  tierPill: { alignSelf: 'flex-start', paddingHorizontal: spacing.xs, paddingVertical: 4, borderRadius: radius.pill },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.avoidTint,
    borderWidth: 1,
    borderColor: 'rgba(207,74,69,0.25)',
  },
  section: { marginTop: spacing.lg },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  breakdownRow: { paddingHorizontal: spacing.md, gap: spacing.xl },
  breakdownCell: { minWidth: 62 },
  ingredientWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ingredientPill: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 5,
    borderRadius: radius.xs,
    maxWidth: '100%',
  },
  nutriRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  floatingBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roundIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
});
