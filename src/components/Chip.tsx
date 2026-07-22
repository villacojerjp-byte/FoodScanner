import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/src/theme';

import { Text } from './Text';

interface ChipProps {
  label: string;
  emoji?: string;
  selected?: boolean;
  onPress?: () => void;
  caption?: string;
  size?: 'sm' | 'md';
}

export function Chip({ label, emoji, selected, onPress, caption, size = 'md' }: ChipProps) {
  const base = [styles.chip, size === 'sm' && styles.chipSm, selected && styles.selected];

  const content = (
    <>
      {!!emoji && <Text variant={size === 'sm' ? 'small' : 'body'}>{emoji}</Text>}
      <View>
        <Text
          variant={size === 'sm' ? 'small' : 'bodyStrong'}
          color={selected ? colors.olive : colors.text}
        >
          {label}
        </Text>
        {!!caption && (
          <Text variant="small" tone="muted" style={{ marginTop: 1 }}>
            {caption}
          </Text>
        )}
      </View>
    </>
  );

  // A plain View ignores the function form of `style`, so only Pressable gets it.
  if (!onPress) return <View style={base}>{content}</View>;

  const handlePress = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!selected }}
      onPress={handlePress}
      style={({ pressed }) => [...base, pressed && { opacity: 0.75 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSm: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  selected: {
    borderColor: colors.oliveMid,
    backgroundColor: colors.oliveTint,
  },
});
