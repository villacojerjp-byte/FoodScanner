import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/Button';
import { Chip } from '@/src/components/Chip';
import { Text } from '@/src/components/Text';
import { AVOID_PREFERENCES, DIET_FLAGS } from '@/src/scoring/rules';
import { useAppState } from '@/src/store/AppState';
import { colors, radius, shadow, spacing } from '@/src/theme';

const STEPS = ['welcome', 'avoid', 'diet', 'name'] as const;
type Step = (typeof STEPS)[number];

const HIGHLIGHTS = [
  { icon: 'scan-outline' as const, title: 'Scan any barcode', body: 'Food, skincare and cosmetics — 4M+ products.' },
  { icon: 'flask-outline' as const, title: 'See what is really inside', body: 'Additives, seed oils, parabens, fragrance and allergens.' },
  { icon: 'swap-horizontal-outline' as const, title: 'Get smarter swaps', body: 'Cleaner alternatives from the same aisle.' },
];

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { prefs, toggleAvoid, toggleDiet, setName, completeOnboarding, name } = useAppState();
  const [index, setIndex] = useState(0);
  const [draftName, setDraftName] = useState(name);

  const step: Step = STEPS[index];
  const progress = useMemo(() => (index + 1) / STEPS.length, [index]);

  const next = () => {
    if (index < STEPS.length - 1) {
      setIndex((i) => i + 1);
      return;
    }
    setName(draftName.trim());
    completeOnboarding();
    router.replace('/(tabs)');
  };

  const back = () => setIndex((i) => Math.max(0, i - 1));

  if (step === 'welcome') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.oliveDeep }}>
        <StatusBar style="light" />
        <LinearGradient
          colors={[colors.oliveDeep, colors.olive, '#3E6B41']}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.welcome, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.logoMark}>
            <Ionicons name="leaf" size={30} color={colors.oliveDeep} />
          </View>

          <Text variant="display" tone="onDark" style={{ marginTop: spacing.lg }}>
            Know what you{'\n'}put in and on{'\n'}your body.
          </Text>
          <Text variant="body" tone="onDarkMuted" style={{ marginTop: spacing.sm, maxWidth: 300 }}>
            Scan a barcode and get a clear score, the ingredients that matter, and a cleaner swap.
          </Text>

          <View style={{ marginTop: spacing.xxl, gap: spacing.md }}>
            {HIGHLIGHTS.map((h) => (
              <View key={h.title} style={styles.highlight}>
                <View style={styles.highlightIcon}>
                  <Ionicons name={h.icon} size={20} color={colors.lime} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" tone="onDark">
                    {h.title}
                  </Text>
                  <Text variant="small" tone="onDarkMuted">
                    {h.body}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ flex: 1 }} />
          <Button
            label="Get started"
            onPress={next}
            size="lg"
            style={{ backgroundColor: colors.lime }}
            textColor={colors.oliveDeep}
          />
          <Text variant="small" tone="onDarkMuted" center style={{ marginTop: spacing.sm }}>
            Free. No account needed.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.lg }}>
        <View style={styles.topBar}>
          <Pressable onPress={back} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text variant="small" tone="muted">
            {index + 1}/{STEPS.length}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 'avoid' && (
          <>
            <Text variant="title">What should we watch for?</Text>
            <Text variant="body" tone="muted" style={{ marginTop: spacing.xs }}>
              Anything you pick here gets flagged loudly and caps a product&apos;s score.
            </Text>
            <View style={styles.grid}>
              {AVOID_PREFERENCES.map((a) => (
                <Chip
                  key={a.id}
                  label={a.label}
                  emoji={a.emoji}
                  caption={a.description}
                  selected={prefs.avoid.includes(a.id)}
                  onPress={() => toggleAvoid(a.id)}
                />
              ))}
            </View>
          </>
        )}

        {step === 'diet' && (
          <>
            <Text variant="title">Any dietary needs?</Text>
            <Text variant="body" tone="muted" style={{ marginTop: spacing.xs }}>
              We&apos;ll show a hard warning when a product breaks one of these.
            </Text>
            <View style={styles.wrapGrid}>
              {DIET_FLAGS.map((d) => (
                <Chip
                  key={d.id}
                  label={d.label}
                  emoji={d.emoji}
                  selected={prefs.diets.includes(d.id)}
                  onPress={() => toggleDiet(d.id)}
                />
              ))}
            </View>
          </>
        )}

        {step === 'name' && (
          <>
            <Text variant="title">Almost there.</Text>
            <Text variant="body" tone="muted" style={{ marginTop: spacing.xs }}>
              What should we call you?
            </Text>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Your first name"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={next}
              accessibilityLabel="Your first name"
            />

            <View style={styles.summary}>
              <Text variant="caption" tone="muted" uppercase>
                Your profile
              </Text>
              <View style={[styles.wrapGrid, { marginTop: spacing.sm }]}>
                {prefs.avoid.length === 0 && prefs.diets.length === 0 ? (
                  <Text variant="small" tone="muted">
                    No filters yet — you can add them any time in Profile.
                  </Text>
                ) : (
                  <>
                    {prefs.diets.map((id) => {
                      const d = DIET_FLAGS.find((x) => x.id === id);
                      return d ? <Chip key={id} label={d.label} emoji={d.emoji} size="sm" selected /> : null;
                    })}
                    {prefs.avoid.map((id) => {
                      const a = AVOID_PREFERENCES.find((x) => x.id === id);
                      return a ? <Chip key={id} label={a.label} emoji={a.emoji} size="sm" selected /> : null;
                    })}
                  </>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          label={step === 'name' ? 'Start scanning' : 'Continue'}
          onPress={next}
          size="lg"
        />
        {step !== 'name' && (
          <Button label="Skip for now" variant="ghost" size="sm" onPress={next} haptic={false} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  welcome: { flex: 1, paddingHorizontal: spacing.lg },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  highlightIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bgAlt,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.oliveMid, borderRadius: 3 },
  grid: { marginTop: spacing.lg, gap: spacing.sm },
  wrapGrid: { marginTop: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  input: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 54,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  summary: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSunken,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xxs,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...shadow.card,
  },
});
