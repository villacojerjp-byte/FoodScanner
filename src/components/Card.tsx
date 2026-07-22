import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, shadow, spacing } from '@/src/theme';

import { Text } from './Text';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  flat?: boolean;
}

export function Card({ children, style, padded = true, flat }: CardProps) {
  return (
    <View style={[styles.card, padded && styles.padded, flat ? styles.flat : shadow.card, style]}>
      {children}
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  caption,
}: {
  title: string;
  caption?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text variant="h1">{title}</Text>
        {!!caption && (
          <Text variant="small" tone="muted" style={{ marginTop: 2 }}>
            {caption}
          </Text>
        )}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  padded: {
    padding: spacing.md,
  },
  flat: {
    backgroundColor: colors.surfaceSunken,
    borderColor: 'transparent',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
});
