import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { Eyebrow, Row, Stack, Text } from '@/components/ui';
import { METER_META, motion, radius, space, useTheme } from '@/theme';
import { LEVELS, levelProgress, type Meters } from '@shared/progression';

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * The ladder, as a progress display.
 *
 * The app's own mark used literally: eight rungs for the eight levels, with a
 * figure standing on the one you hold. It replaces an abstract percentage bar
 * with something that says where you are in a career shape. You can see three
 * rungs above you, which a bar at 38% does not communicate.
 *
 * The climb animation fires only when the level actually changes. Animating the
 * figure on every mount would make an ordinary screen visit look like an
 * achievement.
 */
export function ProgressLadder({
  meters,
  height = 240,
  width = 132,
  celebrateTo,
}: {
  meters: Meters;
  height?: number;
  width?: number;
  /** Set to the new level index to animate a climb into it. */
  celebrateTo?: number | null;
}) {
  const theme = useTheme();
  const progress = levelProgress(meters);
  const level = progress.level.index;

  const rungCount = LEVELS.length;
  const railInset = 22;
  const topPad = 16;
  const bottomPad = 26;
  const usable = height - topPad - bottomPad;
  const gap = usable / (rungCount - 1);

  // Rung 0 sits at the bottom; the ladder is climbed upward.
  const rungY = (index: number) => topPad + (rungCount - 1 - index) * gap;

  const climberY = useSharedValue(rungY(level));
  const bounce = useSharedValue(0);

  useEffect(() => {
    const target = rungY(level);
    if (celebrateTo != null && celebrateTo === level) {
      // Step up with a small hop, then settle, the shape of actually climbing.
      climberY.value = withSequence(
        withTiming(target - 10, { duration: 320, easing: Easing.out(Easing.cubic) }),
        withSpring(target, { damping: 11, stiffness: 170 })
      );
      bounce.value = withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(200, withTiming(0, { duration: 400 }))
      );
    } else {
      climberY.value = withTiming(target, { duration: motion.slow });
    }
  }, [level, celebrateTo, climberY, bounce, height]);

  const climberStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: climberY.value - 11 }, { scale: 1 + bounce.value * 0.12 }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: bounce.value * 0.45,
    transform: [{ scale: 1 + bounce.value * 1.6 }],
  }));

  return (
    <View style={{ width, height, alignSelf: 'center' }}>
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        {/* Rails */}
        <Line x1={railInset} y1={topPad - 6} x2={railInset} y2={height - bottomPad + 8}
              stroke={theme.border} strokeWidth={3} strokeLinecap="round" />
        <Line x1={width - railInset} y1={topPad - 6} x2={width - railInset} y2={height - bottomPad + 8}
              stroke={theme.border} strokeWidth={3} strokeLinecap="round" />

        {LEVELS.map((entry) => {
          const y = rungY(entry.index);
          const reached = entry.index <= level;
          return (
            <Rect
              key={entry.index}
              x={railInset}
              y={y - 2}
              width={width - railInset * 2}
              height={4}
              rx={2}
              fill={reached ? theme.accent : theme.border}
              opacity={reached ? 1 : 0.75}
            />
          );
        })}
      </Svg>

      {/* Halo behind the figure on a level-up. */}
      <AnimatedView
        style={[
          {
            position: 'absolute',
            left: width / 2 - 17,
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: theme.accent,
          },
          climberStyle,
          haloStyle,
        ]}
        pointerEvents="none"
      />

      {/* The climber. A plain glyph, not a character. This sits on a study
          screen and a cartoon would undercut it. */}
      <AnimatedView
        style={[{ position: 'absolute', left: width / 2 - 11, width: 22, height: 22 }, climberStyle]}
        pointerEvents="none">
        <Svg width={22} height={22} viewBox="0 0 22 22">
          <Circle cx={11} cy={5} r={3.4} fill={theme.accent} />
          <Path
            d="M11 8.6v6.2M11 10.6 7.4 12.6M11 10.6l3.6 2M11 14.8l-3 4.2M11 14.8l3 4.2"
            stroke={theme.accent}
            strokeWidth={2.1}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </AnimatedView>
    </View>
  );
}

/** The ladder plus the labels that make it readable. */
export function LadderCard({ meters, celebrateTo }: { meters: Meters; celebrateTo?: number | null }) {
  const theme = useTheme();
  const progress = levelProgress(meters);

  return (
    <Row gap={space.lg} align="center">
      <ProgressLadder meters={meters} celebrateTo={celebrateTo} />
      <Stack gap={space.sm} style={{ flex: 1 }}>
        <Eyebrow>Rung {progress.level.index + 1} of {LEVELS.length}</Eyebrow>
        <Text variant="title">{progress.level.title}</Text>
        <Text variant="small" tone="textMuted">
          {progress.level.note}
        </Text>
        {progress.next ? (
          <View
            style={{
              marginTop: space.xs,
              padding: space.md,
              borderRadius: radius.md,
              backgroundColor: theme.accentSoft,
            }}>
            <Text variant="caption" tone="accent">
              Next rung: {progress.next.title}
            </Text>
            <Text variant="caption" tone="textMuted">
              {progress.deficit.toLocaleString()} {METER_META[progress.blockedBy].label} XP away
            </Text>
            <Text variant="caption" tone="textFaint">
              Rungs climb on your weakest meter, so only XP landing on{' '}
              {METER_META[progress.blockedBy].label} moves this number.
            </Text>
          </View>
        ) : null}
      </Stack>
    </Row>
  );
}
