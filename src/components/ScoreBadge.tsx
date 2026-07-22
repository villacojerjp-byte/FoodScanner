import React from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing, tierForScore, tierMeta } from '@/src/theme';

import { Text } from './Text';

/** Compact score pill used in lists, rows and search results. */
export function ScoreBadge({ score, showLabel = false }: { score: number; showLabel?: boolean }) {
  const tier = tierForScore(score);
  const meta = tierMeta[tier];
  return (
    <View style={[styles.badge, { backgroundColor: meta.tint }]}>
      <View style={[styles.dot, { backgroundColor: meta.color }]} />
      <Text variant="bodyStrong" color={meta.color}>
        {score}
      </Text>
      {showLabel && (
        <Text variant="small" color={meta.color}>
          {meta.label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
