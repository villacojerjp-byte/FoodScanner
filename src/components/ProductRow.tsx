import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/src/theme';

import { ScoreBadge } from './ScoreBadge';
import { Text } from './Text';

interface ProductRowProps {
  name: string;
  brand?: string;
  imageUrl?: string;
  score?: number;
  meta?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}

export function ProductRow({ name, brand, imageUrl, score, meta, onPress, right }: ProductRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.thumbWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.thumb} contentFit="contain" transition={180} />
        ) : (
          <Ionicons name="cube-outline" size={22} color={colors.textFaint} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="small" tone="muted" numberOfLines={1} style={{ marginTop: 1 }}>
          {[brand, meta].filter(Boolean).join(' · ') || 'Unknown brand'}
        </Text>
      </View>
      {right ?? (score !== undefined ? <ScoreBadge score={score} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  thumbWrap: {
    width: 50,
    height: 50,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: '100%' },
});
