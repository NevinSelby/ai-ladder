import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import {
  IconArrowRight,
  IconBoard,
  IconGem,
  IconLadder,
  IconLearn,
  IconLock,
  IconPractice,
  IconProgress,
  IconQuest,
  IconToday,
  IconTrophy,
  IconUser,
} from '@/components/icons';
import { Breathe, PulseDot } from '@/components/ambient';
import { Card, Chip, Eyebrow, Row, Screen, Spacer, Stack, Text } from '@/components/ui';
import { useProfile } from '@/hooks/use-app-state';
import { db } from '@/db';
import { contentItems } from '@/db/schema';
import { radius, space, useTheme } from '@/theme';
import { MODES, MODE_META, type Mode } from '@shared/content';
import { drillMinutes } from '@shared/progression';
import { sql } from 'drizzle-orm';

const LIVE: Mode[] = ['drill', 'arena'];

/** One icon per mode. A list of nine text blocks is a wall; nine marks is a menu. */
const MODE_ICON: Record<Mode, typeof IconToday> = {
  drill: IconToday,
  decompose: IconQuest,
  room: IconUser,
  arena: IconTrophy,
  napkin: IconGem,
  incident: IconBoard,
  blueprint: IconLadder,
  evallab: IconProgress,
  discovery: IconLearn,
};

export default function PracticeScreen() {
  const theme = useTheme();
  const { data: profile } = useProfile();

  const { data: counts = {} } = useQuery({
    queryKey: ['app-state', 'mode-counts'],
    queryFn: async () => {
      const rows = await db
        .select({ mode: contentItems.mode, count: sql<number>`count(*)` })
        .from(contentItems)
        .groupBy(contentItems.mode);
      return Object.fromEntries(rows.map((row) => [row.mode, row.count])) as Record<string, number>;
    },
    placeholderData: {},
  });

  const ordered = [...MODES].sort((a, b) => {
    const liveDelta = Number(LIVE.includes(b)) - Number(LIVE.includes(a));
    if (liveDelta !== 0) return liveDelta;
    return MODE_META[a].phase - MODE_META[b].phase;
  });

  return (
    <Screen>
      <Spacer size={space.sm} />
      <Stack gap={space.xs}>
        <Eyebrow>Modes</Eyebrow>
        <Text variant="display">Practice</Text>
        <Text variant="small" tone="textMuted">
          Nine ways to be wrong in private instead of in front of a customer.
        </Text>
      </Stack>

      <Spacer size={space.xl} />

      <Stack gap={space.md}>
        {ordered.map((mode) => {
          const meta = MODE_META[mode];
          const live = LIVE.includes(mode);
          const authored = counts[mode] ?? 0;

          return (
            <Pressable
              key={mode}
              disabled={!live}
              onPress={() => router.push(mode === 'arena' ? '/session/arena' : '/session/drill')}>
              <Card padded={false}>
                <View style={{ padding: space.lg, gap: space.sm, opacity: live ? 1 : 0.6 }}>
                  <Row justify="space-between" align="center">
                    <Row gap={space.md} align="center">
                      <ModeMedallion mode={mode} live={live} />
                      <Row gap={space.sm} align="center">
                        {!live ? <IconLock color={theme.textFaint} size={15} /> : null}
                        <Text variant="bodyStrong">{meta.label}</Text>
                      </Row>
                    </Row>
                    <Row gap={space.xs} align="center">
                      <Chip
                        label={`${mode === 'drill' ? drillMinutes(profile.dailyGoal) : meta.minutes} min`}
                        color={theme.textFaint}
                      />
                      {live ? (
                        <IconArrowRight color={theme.accent} size={17} />
                      ) : (
                        <Chip label="soon" color={theme.textFaint} />
                      )}
                    </Row>
                  </Row>

                  <Text variant="small" tone="textMuted">
                    {meta.tagline}
                  </Text>

                  {authored > 0 ? (
                    <Text variant="caption" tone="textFaint">
                      {authored} scenario{authored === 1 ? '' : 's'} written
                      {live ? '' : ' · runner in progress'}
                    </Text>
                  ) : null}
                </View>
              </Card>
            </Pressable>
          );
        })}
      </Stack>

      <Spacer size={space.lg} />
      <View
        style={{
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: theme.border,
          borderStyle: 'dashed',
          padding: space.lg,
        }}>
        <Text variant="caption" tone="textMuted">
          Several locked modes already have scenarios written and validated. What is missing is
          the runner and, for the judgment modes, the rubric grader behind them.
        </Text>
      </View>
      <Spacer />
    </Screen>
  );
}

/** The per-mode icon in a tinted circle. Live modes breathe; locked ones sit still. */
function ModeMedallion({ mode, live }: { mode: Mode; live: boolean }) {
  const theme = useTheme();
  const Icon = MODE_ICON[mode];

  const badge = (
    <View
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: live ? theme.accentSoft : theme.elevated,
      }}>
      <Icon color={live ? theme.accent : theme.textFaint} size={20} />
      {live ? (
        <View style={{ position: 'absolute', top: 1, right: 1 }}>
          <PulseDot color={theme.positive} size={5} />
        </View>
      ) : null}
    </View>
  );

  return live ? <Breathe amount={0.05} period={3400}>{badge}</Breathe> : badge;
}
