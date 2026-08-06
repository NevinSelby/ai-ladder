import { View } from 'react-native';

import { Row, Text } from '@/components/ui';
import { radius, space, useTheme } from '@/theme';
import { DIFFICULTY_META, xpOnOffer } from '@shared/progression';

/**
 * Difficulty and the XP it carries.
 *
 * Shown before the question is answered, not after. The reward has to be
 * visible while you are still deciding how much thought to give something, 
 * revealing it afterwards turns it into a score report rather than an incentive.
 *
 * Difficulty is encoded three ways at once: the word, a filled-pip meter, and
 * position on a warm-to-hot ramp. Color alone would fail both a colorblind
 * reader and a glance at arm's length.
 */
export function DifficultyTag({
  difficulty,
  mode = 'drill',
  showXp = true,
  compact = false,
}: {
  difficulty: string;
  mode?: string;
  showXp?: boolean;
  compact?: boolean;
}) {
  const theme = useTheme();
  const meta = DIFFICULTY_META[difficulty] ?? DIFFICULTY_META.core;

  // Warm to hot as demand rises. Positive green is deliberately avoided, an
  // easy question is not "good", it is just easy.
  const tint =
    meta.rank === 1
      ? theme.textMuted
      : meta.rank === 2
        ? theme.accent
        : meta.rank === 3
          ? theme.warning
          : theme.negative;

  return (
    <Row gap={space.sm} align="center">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: space.sm + 2,
          paddingVertical: 4,
          borderRadius: radius.pill,
          backgroundColor: tint + '18',
        }}>
        {/* Pip meter: the redundant, non-color channel. */}
        <Row gap={2} align="center">
          {[1, 2, 3, 4].map((step) => (
            <View
              key={step}
              style={{
                width: 4,
                height: step <= meta.rank ? 10 : 5,
                borderRadius: 2,
                backgroundColor: step <= meta.rank ? tint : tint + '44',
              }}
            />
          ))}
        </Row>
        <Text variant="eyebrow" color={tint}>
          {compact ? meta.short : meta.label}
        </Text>
      </View>

      {showXp ? (
        <Text variant="eyebrow" tone="textFaint">
          +{xpOnOffer(mode, difficulty)} XP
        </Text>
      ) : null}
    </Row>
  );
}
