import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Flag } from '@/src/scoring/engine';
import { Severity } from '@/src/scoring/rules';
import { colors, radius, spacing } from '@/src/theme';

import { Text } from './Text';

const severityStyle: Record<
  Severity,
  { color: string; tint: string; icon: keyof typeof Ionicons.glyphMap; label: string }
> = {
  high: { color: colors.avoid, tint: colors.avoidTint, icon: 'alert-circle', label: 'High concern' },
  medium: { color: colors.poor, tint: colors.poorTint, icon: 'warning', label: 'Moderate' },
  low: { color: colors.moderate, tint: colors.moderateTint, icon: 'information-circle', label: 'Minor' },
  positive: { color: colors.excellent, tint: colors.excellentTint, icon: 'checkmark-circle', label: 'Positive' },
};

export function FlagRow({ flag }: { flag: Flag }) {
  const s = severityStyle[flag.severity];
  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: s.tint }]}>
        <Ionicons name={s.icon} size={18} color={s.color} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant="bodyStrong" style={{ flex: 1 }}>
            {flag.title}
          </Text>
          {flag.personal && (
            <View style={styles.personalTag}>
              <Text variant="caption" color={colors.avoid} uppercase>
                Your list
              </Text>
            </View>
          )}
        </View>
        <Text variant="small" tone="muted" style={{ marginTop: 3 }}>
          {flag.detail}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  personalTag: {
    backgroundColor: colors.avoidTint,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
});
