import { Ionicons } from '@expo/vector-icons';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/Button';
import { Text } from '@/src/components/Text';
import { absoluteFill, colors, radius, spacing } from '@/src/theme';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'itf14'] as const;

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [manual, setManual] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const locked = useRef(false);

  const openProduct = useCallback(
    (code: string) => {
      if (locked.current) return;
      locked.current = true;
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      router.replace({ pathname: '/product/[barcode]', params: { barcode: code } });
      // Re-arm shortly after so returning to this screen can scan again.
      setTimeout(() => {
        locked.current = false;
      }, 1200);
    },
    [router],
  );

  const onBarcode = useCallback(
    ({ data }: BarcodeScanningResult) => {
      const code = (data ?? '').trim();
      if (code.length >= 6) openProduct(code);
    },
    [openProduct],
  );

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.lime} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centered, { padding: spacing.lg }]}>
        <StatusBar style="light" />
        <View style={styles.permIcon}>
          <Ionicons name="camera-outline" size={30} color={colors.lime} />
        </View>
        <Text variant="title" tone="onDark" center style={{ marginTop: spacing.lg }}>
          Camera access needed
        </Text>
        <Text variant="body" tone="onDarkMuted" center style={{ marginTop: spacing.xs, maxWidth: 300 }}>
          Olive Scan reads barcodes with your camera. Nothing is recorded or uploaded.
        </Text>
        <Button
          label={permission.canAskAgain ? 'Allow camera' : 'Open settings'}
          onPress={requestPermission}
          style={{ marginTop: spacing.xl, backgroundColor: colors.lime, alignSelf: 'stretch' }}
          textColor={colors.oliveDeep}
          size="lg"
        />
        <Button
          label="Enter a barcode instead"
          variant="ghost"
          textColor={colors.onDark}
          onPress={() => setManual(true)}
        />
        <Button label="Close" variant="ghost" textColor={colors.onDarkMuted} onPress={close} />
        {manual && <ManualEntry value={manualCode} onChange={setManualCode} onSubmit={() => openProduct(manualCode)} />}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <StatusBar style="light" />
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        onBarcodeScanned={manual ? undefined : onBarcode}
      />

      {/* Dimmed surround with a clear cut-out so the aim point is obvious. */}
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.dim} />
        <View style={styles.middleRow}>
          <View style={styles.dim} />
          <View style={styles.window}>
            <Corner style={{ top: -2, left: -2 }} rotate="0deg" />
            <Corner style={{ top: -2, right: -2 }} rotate="90deg" />
            <Corner style={{ bottom: -2, right: -2 }} rotate="180deg" />
            <Corner style={{ bottom: -2, left: -2 }} rotate="270deg" />
          </View>
          <View style={styles.dim} />
        </View>
        <View style={[styles.dim, { paddingTop: spacing.xl }]}>
          <Text variant="h2" tone="onDark" center>
            Point at a barcode
          </Text>
          <Text variant="small" tone="onDarkMuted" center style={{ marginTop: 4 }}>
            Food, skincare and cosmetics all work.
          </Text>
        </View>
      </View>

      <View style={[styles.topBar, { top: insets.top + spacing.xs }]}>
        <RoundButton icon="close" label="Close scanner" onPress={close} />
        <RoundButton
          icon={torch ? 'flashlight' : 'flashlight-outline'}
          label="Toggle torch"
          active={torch}
          onPress={() => setTorch((t) => !t)}
        />
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.lg }]}>
        {manual ? (
          <ManualEntry
            value={manualCode}
            onChange={setManualCode}
            onSubmit={() => openProduct(manualCode)}
            onCancel={() => setManual(false)}
          />
        ) : (
          <Pressable
            onPress={() => setManual(true)}
            style={({ pressed }) => [styles.manualPill, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
          >
            <Ionicons name="keypad-outline" size={16} color={colors.onDark} />
            <Text variant="small" tone="onDark">
              Enter barcode manually
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Corner({ style, rotate }: { style: object; rotate: string }) {
  return <View style={[styles.corner, style, { transform: [{ rotate }] }]} />;
}

function RoundButton({
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
      style={({ pressed }) => [
        styles.roundBtn,
        active && { backgroundColor: colors.lime },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons name={icon} size={20} color={active ? colors.oliveDeep : colors.onDark} />
    </Pressable>
  );
}

function ManualEntry({
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
}) {
  return (
    <View style={styles.manualBox}>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ''))}
        placeholder="e.g. 3017620422003"
        placeholderTextColor={colors.textFaint}
        keyboardType="number-pad"
        style={styles.manualInput}
        autoFocus
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        accessibilityLabel="Barcode number"
      />
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        <Button
          label="Look up"
          onPress={onSubmit}
          size="sm"
          disabled={value.length < 6}
          style={{ flex: 1 }}
        />
        {onCancel && <Button label="Cancel" variant="ghost" size="sm" onPress={onCancel} />}
      </View>
    </View>
  );
}

const WINDOW = 260;

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.oliveDeep },
  permIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: { ...absoluteFill },
  dim: { flex: 1, backgroundColor: 'rgba(12,20,12,0.62)' },
  middleRow: { flexDirection: 'row', height: WINDOW },
  window: {
    width: WINDOW,
    height: WINDOW,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: colors.lime,
    borderTopLeftRadius: radius.lg,
  },
  topBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  manualPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  manualBox: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  manualInput: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
