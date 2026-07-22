import React from 'react';
import { StyleProp, Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';

import { colors, type } from '@/src/theme';

type Variant = keyof typeof type;
type Tone = 'default' | 'muted' | 'faint' | 'onDark' | 'onDarkMuted' | 'brand';

const toneColor: Record<Tone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  faint: colors.textFaint,
  onDark: colors.onDark,
  onDarkMuted: colors.onDarkMuted,
  brand: colors.olive,
};

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  color?: string;
  center?: boolean;
  uppercase?: boolean;
  style?: StyleProp<TextStyle>;
}

export function Text({
  variant = 'body',
  tone = 'default',
  color,
  center,
  uppercase,
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      {...rest}
      style={[
        type[variant],
        { color: color ?? toneColor[tone] },
        center && { textAlign: 'center' },
        uppercase && { textTransform: 'uppercase' },
        style,
      ]}
    />
  );
}
