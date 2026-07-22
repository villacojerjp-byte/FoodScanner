import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import Tabs, { type BottomTabBarProps } from 'expo-router/js-tabs';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/src/components/Text';
import { colors, radius, shadow, spacing } from '@/src/theme';

const ICONS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap; label: string }> = {
  index: { on: 'home', off: 'home-outline', label: 'Today' },
  search: { on: 'search', off: 'search-outline', label: 'Search' },
  history: { on: 'time', off: 'time-outline', label: 'History' },
  profile: { on: 'person', off: 'person-outline', label: 'Profile' },
};

/**
 * Custom bar so the scan action can sit raised in the middle — the single
 * highest-intent action in a scanner app deserves the biggest target.
 */
function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const routes = state.routes.filter((r: { name: string }) => r.name in ICONS);
  const left = routes.slice(0, 2);
  const right = routes.slice(2);

  const renderTab = (route: (typeof routes)[number]) => {
    const isFocused = state.routes[state.index].key === route.key;
    const meta = ICONS[route.name];
    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={meta.label}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        }}
        style={({ pressed }) => [styles.tab, pressed && { opacity: 0.6 }]}
      >
        <Ionicons
          name={isFocused ? meta.on : meta.off}
          size={22}
          color={isFocused ? colors.olive : colors.textFaint}
        />
        <Text variant="caption" color={isFocused ? colors.olive : colors.textFaint}>
          {meta.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={styles.side}>{left.map(renderTab)}</View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Scan a barcode"
        onPress={() => {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          }
          router.push('/scan');
        }}
        style={({ pressed }) => [styles.scanButton, pressed && { transform: [{ scale: 0.94 }] }]}
      >
        <Ionicons name="scan" size={26} color={colors.onDark} />
      </Pressable>

      <View style={styles.side}>{right.map(renderTab)}</View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  side: { flex: 1, flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4 },
  scanButton: {
    width: 62,
    height: 62,
    borderRadius: radius.pill,
    backgroundColor: colors.olive,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    marginHorizontal: spacing.xs,
    borderWidth: 4,
    borderColor: colors.bg,
    ...shadow.lifted,
  },
});
