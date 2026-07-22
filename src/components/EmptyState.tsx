import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/src/theme';

import { Button } from './Button';
import { Text } from './Text';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'leaf-outline', title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={28} color={colors.oliveMid} />
      </View>
      <Text variant="h2" center>
        {title}
      </Text>
      {!!message && (
        <Text variant="small" tone="muted" center style={{ marginTop: spacing.xxs, maxWidth: 280 }}>
          {message}
        </Text>
      )}
      {!!actionLabel && (
        <Button label={actionLabel} onPress={onAction} size="sm" style={{ marginTop: spacing.md }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: colors.oliveTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
});
