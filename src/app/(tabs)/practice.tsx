import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import {
  IconArrowRight,
  IconBoard,
  IconEye,
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

const LIVE: Mode[] = ['drill', 'arena', 'flaw'];

/** One icon per mode. A list of ten text blocks is a wall; ten marks is a menu. */
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
  flaw: IconEye,
};

/**
 * Modes grouped by what they train.
 *
 * Ten modes in one flat list is a wall of choices, and a wall of choices reads
 * as work. Three short groups with a sentence each say what kind of practice
 * you are about to do, which is the actual decision being made.
 */
const GROUPS: { title: string; blurb: string; modes: Mode[] }[] = [
  {
    title: 'Daily',
    blurb: 'Short, repeatable, and the ones that carry your streak.',
    modes: ['drill', 'arena', 'flaw'],
  },
  {
    title: 'Judgment',
    blurb: 'Longer rounds that score how you think, not what you recall.',
    modes: ['decompose', 'room', 'discovery'],
  },
  {
    title: 'Depth',
    blurb: 'Specialist drills for the parts of the job that bite hardest.',
    modes: ['napkin', 'incident', 'blueprint', 'evallab'],
  },
];

/** Where each mode's runner lives. Unlisted modes are not yet playable. */
const ROUTE: Partial<Record<Mode, string>> = {
  drill: '/session/drill',
  arena: '/session/arena',
  flaw: '/session/flaw',
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

      <Stack gap={space.xxl}>
        {GROUPS.map((group) => (
          <Stack key={group.title} gap={space.md}>
            <Stack gap={2}>
              <Eyebrow>{group.title}</Eyebrow>
              <Text variant="caption" tone="textFaint">
                {group.blurb}
              </Text>
            </Stack>

            {group.modes.map((mode) => {
              const meta = MODE_META[mode];
              const live = LIVE.includes(mode);
              const authored = counts[mode] ?? 0;
              const route = ROUTE[mode];

              return (
                <Pressable
                  key={mode}
                  disabled={!live || !route}
                  onPress={() => route && router.push(route as never)}>
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
        ))}
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
