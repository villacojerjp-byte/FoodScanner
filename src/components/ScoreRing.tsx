import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { VerdictTier, absoluteFill, colors, tierMeta } from '@/src/theme';

import { Text } from './Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ScoreRingProps {
  score: number;
  tier: VerdictTier;
  size?: number;
  strokeWidth?: number;
  caption?: string;
  animate?: boolean;
}

/** The hero element of a result screen: score out of 100 inside a progress arc. */
export function ScoreRing({
  score,
  tier,
  size = 148,
  strokeWidth = 12,
  caption,
  animate = true,
}: ScoreRingProps) {
  const radiusValue = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusValue;
  const progress = useSharedValue(animate ? 0 : score / 100);

  useEffect(() => {
    progress.value = withTiming(score / 100, {
      duration: animate ? 900 : 0,
      easing: Easing.out(Easing.cubic),
    });
  }, [score, animate, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const color = tierMeta[tier].color;

  return (
    <View style={{ width: size, height: size }} accessibilityRole="image" accessibilityLabel={`Score ${score} out of 100, ${tierMeta[tier].label}`}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.75" />
            <Stop offset="1" stopColor={color} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={colors.bgAlt}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke="url(#ringGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={{ fontSize: size * 0.3, lineHeight: size * 0.34, fontWeight: '800', color }}>
          {score}
        </Text>
        <Text variant="caption" tone="muted" uppercase>
          {caption ?? `/ 100`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
