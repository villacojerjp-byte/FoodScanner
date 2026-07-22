import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ATTRIBUTION, clearProductCache } from '@/src/api/openFacts';
import { Card, SectionHeader } from '@/src/components/Card';
import { Chip } from '@/src/components/Chip';
import { Text } from '@/src/components/Text';
import { AVOID_PREFERENCES, DIET_FLAGS } from '@/src/scoring/rules';
import { useAppState } from '@/src/store/AppState';
import { colors, radius, spacing } from '@/src/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { name, setName, prefs, toggleDiet, toggleAvoid, history, saved, resetAll } = useAppState();
  const [editingName, setEditingName] = useState(false);
  const [draft, setDraft] = useState(name);

  const commitName = () => {
    setName(draft.trim());
    setEditingName(false);
  };

  const confirmReset = () => {
    Alert.alert(
      'Reset everything?',
      'This clears your preferences, scan history and saved products on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetAll();
            router.replace('/onboarding');
          },
        },
      ],
    );
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text variant="display" tone="brand">
            {(name || 'O').charAt(0).toUpperCase()}
          </Text>
        </View>
        {editingName ? (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onBlur={commitName}
            onSubmitEditing={commitName}
            autoFocus
            style={styles.nameInput}
            placeholder="Your name"
            placeholderTextColor={colors.textFaint}
            accessibilityLabel="Your name"
          />
        ) : (
          <Pressable onPress={() => setEditingName(true)} style={styles.nameRow} accessibilityRole="button">
            <Text variant="title">{name || 'Add your name'}</Text>
            <Ionicons name="pencil" size={15} color={colors.textFaint} />
          </Pressable>
        )}
        <Text variant="small" tone="muted" style={{ marginTop: 2 }}>
          {history.length} scan{history.length === 1 ? '' : 's'} · {saved.length} saved
        </Text>
      </View>

      <View style={styles.block}>
        <SectionHeader
          title="Ingredients to avoid"
          caption="Products containing these are capped at a low score"
        />
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
      </View>

      <View style={styles.block}>
        <SectionHeader title="Dietary needs" caption="Shown as a hard warning on the product screen" />
        <View style={styles.chipWrap}>
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
      </View>

      <View style={styles.block}>
        <SectionHeader title="Data & privacy" />
        <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
          <Row
            icon="cloud-download-outline"
            title="Clear cached products"
            subtitle="Frees space and refetches the latest data"
            onPress={async () => {
              await clearProductCache();
              Alert.alert('Cache cleared', 'Product data will be fetched fresh on the next scan.');
            }}
          />
          <Row
            icon="globe-outline"
            title="Open Food Facts"
            subtitle="The open database behind every score"
            divider
            onPress={() => Linking.openURL('https://world.openfoodfacts.org')}
          />
          <Row
            icon="color-palette-outline"
            title="Open Beauty Facts"
            subtitle="Cosmetics and personal care data"
            divider
            onPress={() => Linking.openURL('https://world.openbeautyfacts.org')}
          />
          <Row
            icon="refresh-outline"
            title="Reset app"
            subtitle="Clear preferences, history and saved items"
            divider
            destructive
            onPress={confirmReset}
          />
        </Card>
      </View>

      <View style={styles.block}>
        <Card flat>
          <Text variant="caption" tone="muted" uppercase>
            About
          </Text>
          <Text variant="small" tone="muted" style={{ marginTop: spacing.xs }}>
            {ATTRIBUTION} Olive Scan adds its own holistic scoring layer on top — additives, seed
            oils, parabens, fragrance and your personal filters. Scores are informational and are not
            medical advice.
          </Text>
          <Text variant="small" tone="faint" style={{ marginTop: spacing.sm }}>
            Version {version}
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}

function Row({
  icon,
  title,
  subtitle,
  onPress,
  divider,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  divider?: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && { opacity: 0.6 }]}
    >
      <View style={[styles.rowIcon, destructive && { backgroundColor: colors.avoidTint }]}>
        <Ionicons name={icon} size={17} color={destructive ? colors.avoid : colors.oliveMid} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" color={destructive ? colors.avoid : undefined}>
          {title}
        </Text>
        {!!subtitle && (
          <Text variant="small" tone="muted" style={{ marginTop: 1 }}>
            {subtitle}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.oliveTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  nameInput: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    minWidth: 200,
    borderBottomWidth: 2,
    borderBottomColor: colors.oliveSoft,
    paddingVertical: 4,
  },
  block: { marginTop: spacing.xl, paddingHorizontal: spacing.md },
  grid: { gap: spacing.xs },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.oliveTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
