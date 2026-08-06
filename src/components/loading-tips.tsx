import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { LadderMark } from '@/components/logo';
import { Text } from '@/components/ui';
import { LESSONS } from '@/content/lessons';
import { MAX_CONTENT_WIDTH, motion, radius, space, useTheme } from '@/theme';
import { TAXONOMY_BY_ID } from '@shared/taxonomy';

/**
 * Something to read while the app starts.
 *
 * The tips are the `keyPoints` already written for every lesson, so this is not
 * a second body of copy to maintain. It is the same curriculum, surfaced in
 * the one moment the user has nothing else to do. A boot screen that teaches
 * one idea is strictly better than a spinner, and it costs nothing because the
 * content is already in the bundle.
 */

interface Tip {
  text: string;
  topic: string;
}

function buildTips(): Tip[] {
  const tips: Tip[] = [];
  for (const lesson of LESSONS) {
    const topic = TAXONOMY_BY_ID[lesson.nodeIds[0]]?.label ?? lesson.title;
    for (const point of lesson.keyPoints) {
      // Skip anything that only makes sense beside its lesson's other points.
      if (point.length < 30) continue;
      tips.push({ text: point, topic });
    }
  }
  return tips;
}

/** Deterministic per-launch pick, so a fast boot does not flash two tips. */
function pickStart(count: number): number {
  return count > 0 ? Math.floor(Math.random() * count) : 0;
}

export function LoadingTips({ rotateMs = 4200 }: { rotateMs?: number }) {
  const theme = useTheme();
  const tips = useMemo(buildTips, []);
  const [index, setIndex] = useState(() => pickStart(tips.length));

  useEffect(() => {
    if (tips.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % tips.length), rotateMs);
    return () => clearInterval(timer);
  }, [tips.length, rotateMs]);

  const tip = tips[index];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.bg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: space.xl,
        gap: space.xxl,
      }}>
      <LadderMark size={52} color={theme.accent} topColor={theme.accent} />

      {tip ? (
        <Animated.View
          key={index}
          entering={FadeIn.duration(motion.slow)}
          exiting={FadeOut.duration(motion.fast)}
          style={{
            maxWidth: MAX_CONTENT_WIDTH * 0.8,
            gap: space.sm,
            alignItems: 'center',
          }}>
          <View
            style={{
              paddingHorizontal: space.md,
              paddingVertical: 5,
              borderRadius: radius.pill,
              backgroundColor: theme.accentSoft,
            }}>
            <Text variant="eyebrow" tone="accent">
              {tip.topic}
            </Text>
          </View>
          <Text variant="body" center>
            {tip.text}
          </Text>
        </Animated.View>
      ) : null}

      {/* Progress is implied by the tip rotating; a spinner would compete. */}
      <View style={{ height: 3, width: 44, borderRadius: 2, backgroundColor: theme.elevated }}>
        <Animated.View
          entering={FadeIn.duration(motion.slow)}
          style={{ height: 3, width: 18, borderRadius: 2, backgroundColor: theme.accent }}
        />
      </View>
    </View>
  );
}
