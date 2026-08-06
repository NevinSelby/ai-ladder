import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';

import { IconArrowRight, IconCheck, IconLearn, IconLink } from '@/components/icons';
import * as Linking from 'expo-linking';
import { Breathe } from '@/components/ambient';
import { Bar, Card, Chip, Eyebrow, Row, Screen, Spacer, Stack, Text } from '@/components/ui';
import { lessonStats, readLessons, type LessonWithState } from '@/data/learning';
import { recentReleaseNotes } from '@/data/changes';
import { db } from '@/db';
import { useRefreshAppState } from '@/hooks/use-app-state';
import { meterColor, motion, radius, space, useScheme, useTheme } from '@/theme';
import { readSeconds } from '@shared/lessons';
import { BRANCH_META, TAXONOMY_BY_ID } from '@shared/taxonomy';

/**
 * The Learn tab.
 *
 * Theory sits beside practice rather than behind it. Each lesson is a
 * ninety-second read on one idea, and the list is grouped by branch so the
 * shape of the curriculum is visible. You can see that you have read all of
 * Identity and none of Scaling without opening anything.
 */
export default function LearnScreen() {
  const theme = useTheme();
  const scheme = useScheme();
  const refresh = useRefreshAppState();
  const [filter, setFilter] = useState<string | null>(null);

  const { data: lessons = [] } = useQuery({
    queryKey: ['app-state', 'lessons'],
    queryFn: () => readLessons(db),
    placeholderData: [],
  });
  const { data: stats = { total: 0, completed: 0, secondsSpent: 0, byBranch: [] } } = useQuery({
    queryKey: ['app-state', 'lesson-stats'],
    queryFn: () => lessonStats(db),
    placeholderData: { total: 0, completed: 0, secondsSpent: 0, byBranch: [] },
  });

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const grouped = useMemo(() => {
    const map = new Map<string, LessonWithState[]>();
    for (const lesson of lessons) {
      if (filter && lesson.branch !== filter) continue;
      const list = map.get(lesson.branch) ?? [];
      list.push(lesson);
      map.set(lesson.branch, list);
    }
    return [...map.entries()].sort(([a], [b]) =>
      BRANCH_META[a as keyof typeof BRANCH_META].label.localeCompare(
        BRANCH_META[b as keyof typeof BRANCH_META].label
      )
    );
  }, [lessons, filter]);

  const { data: changes = { notes: [], total: 0 } } = useQuery({
    queryKey: ['app-state', 'release-notes'],
    queryFn: () => recentReleaseNotes(),
    placeholderData: { notes: [], total: 0 },
    // Vendor feeds move daily, not by the minute.
    staleTime: 60 * 60 * 1000,
  });

  const nextUp = lessons.find((lesson) => !lesson.completedAt);
  const minutes = Math.round(stats.secondsSpent / 60);

  return (
    <Screen>
      <Spacer size={space.sm} />
      <Animated.View entering={FadeIn.duration(motion.slow)}>
        <Row justify="space-between" align="center">
          <Stack gap={space.xs} style={{ flex: 1, paddingRight: space.lg }}>
            <Eyebrow>Theory</Eyebrow>
            <Text variant="display">Learn</Text>
            <Text variant="small" tone="textMuted">
              One idea per card. Ninety seconds each: what it is, the decision it drives, and the
              part people get wrong.
            </Text>
          </Stack>
          {/* Header mark, so the screen opens on something other than paragraphs. */}
          <Breathe amount={0.06} period={3600}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: theme.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <IconLearn color={theme.accent} size={28} />
            </View>
          </Breathe>
        </Row>
      </Animated.View>

      <Spacer size={space.lg} />

      {/* ── What changed ── */}
      {changes.notes.length > 0 ? (
        <>
          <Animated.View entering={FadeInDown.duration(motion.slow).delay(40)}>
            <Card accent={theme.positive}>
              <Stack gap={space.md}>
                <Row justify="space-between" align="baseline">
                  <Eyebrow tone="positive">Changed this week</Eyebrow>
                  <Text variant="caption" tone="textFaint">
                    {changes.total} release note{changes.total === 1 ? '' : 's'}
                  </Text>
                </Row>

                {changes.notes.map((note) => (
                  <Pressable
                    key={note.id}
                    accessibilityRole="link"
                    accessibilityLabel={`${note.title}, opens ${note.vendor} documentation`}
                    onPress={() => Linking.openURL(note.url).catch(() => {})}>
                    <Row gap={space.sm} align="flex-start">
                      <Chip label={note.vendor} color={theme.textFaint} />
                      <Stack gap={1} style={{ flex: 1 }}>
                        <Text variant="caption" numberOfLines={2}>
                          {note.title}
                        </Text>
                        {note.publishedAt ? (
                          <Text variant="caption" tone="textFaint">
                            {new Date(note.publishedAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </Text>
                        ) : null}
                      </Stack>
                      <IconLink color={theme.accent} size={13} />
                    </Row>
                  </Pressable>
                ))}

                <Text variant="caption" tone="textFaint">
                  Pulled nightly from the official Google Cloud, AWS and Azure release feeds.
                  Every line links to the vendor's own page, so a renamed product or a
                  superseded control shows up here rather than in an interview.
                </Text>
              </Stack>
            </Card>
          </Animated.View>
          <Spacer size={space.md} />
        </>
      ) : null}

      {/* ── Contribute ── */}
      <Animated.View entering={FadeInDown.duration(motion.slow).delay(50)}>
        <Pressable onPress={() => router.push('/submit')}>
          <Card>
            <Row justify="space-between" align="center">
              <Stack gap={2} style={{ flex: 1, paddingRight: space.md }}>
                <Text variant="smallStrong">Write a question</Text>
                <Text variant="caption" tone="textFaint">
                  Had a real interview question? Add it. Reviewed before anyone sees it.
                </Text>
              </Stack>
              <IconArrowRight color={theme.accent} size={17} />
            </Row>
          </Card>
        </Pressable>
      </Animated.View>

      <Spacer size={space.md} />

      {/* ── Progress ── */}
      <Animated.View entering={FadeInDown.duration(motion.slow).delay(60)}>
        <Card>
          <Stack gap={space.md}>
            <Row justify="space-between" align="baseline">
              <Eyebrow>Progress</Eyebrow>
              <Text variant="numericSm" tone="textMuted">
                {stats.completed} / {stats.total}
              </Text>
            </Row>
            <Bar
              value={stats.total ? stats.completed / stats.total : 0}
              color={theme.accent}
              height={9}
            />
            <Text variant="caption" tone="textFaint">
              {minutes > 0
                ? `${minutes} minute${minutes === 1 ? '' : 's'} of reading logged.`
                : 'Nothing read yet. Start anywhere. The cards are independent.'}
            </Text>
          </Stack>
        </Card>
      </Animated.View>

      {/* ── Continue ── */}
      {nextUp ? (
        <>
          <Spacer size={space.md} />
          <Animated.View entering={FadeInDown.duration(motion.slow).delay(120)}>
            <Pressable onPress={() => router.push(`/lesson/${nextUp.id}`)}>
              <Card accent={theme.accent} level={2}>
                <Stack gap={space.sm}>
                  <Row justify="space-between" align="center">
                    <Eyebrow tone="accent">Next up</Eyebrow>
                    <Chip label={`${Math.round(readSeconds(nextUp))}s`} color={theme.textFaint} />
                  </Row>
                  <Text variant="heading">{nextUp.title}</Text>
                  <Text variant="small" tone="textMuted">
                    {nextUp.hook}
                  </Text>
                  <Row gap={6} align="center">
                    <Text variant="caption" tone="accent">
                      Read it
                    </Text>
                    <IconArrowRight color={theme.accent} size={15} />
                  </Row>
                </Stack>
              </Card>
            </Pressable>
          </Animated.View>
        </>
      ) : null}

      <Spacer size={space.lg} />

      {/* ── Branch filter ── */}
      <Row gap={space.xs} wrap>
        <FilterChip label="All" active={filter === null} onPress={() => setFilter(null)} />
        {stats.byBranch.map((branch) => (
          <FilterChip
            key={branch.branch}
            label={`${branch.label} ${branch.completed}/${branch.total}`}
            active={filter === branch.branch}
            onPress={() => setFilter(filter === branch.branch ? null : branch.branch)}
          />
        ))}
      </Row>

      <Spacer size={space.lg} />

      {/* ── Lessons by branch ── */}
      <Stack gap={space.xl}>
        {grouped.map(([branch, items], groupIndex) => (
          <Animated.View
            key={branch}
            entering={FadeInDown.duration(motion.slow).delay(groupIndex * 60)}
            layout={LinearTransition.duration(motion.base)}>
            <Stack gap={space.sm}>
              <Eyebrow>{BRANCH_META[branch as keyof typeof BRANCH_META].label}</Eyebrow>
              {items.map((lesson, index) => {
                const node = TAXONOMY_BY_ID[lesson.nodeIds[0]];
                const tint = node ? meterColor(node.meter, scheme) : theme.accent;
                return (
                  <Animated.View
                    key={lesson.id}
                    entering={FadeIn.duration(motion.base).delay(index * 35)}>
                    <Pressable onPress={() => router.push(`/lesson/${lesson.id}`)}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: space.md,
                          padding: space.lg - 2,
                          borderRadius: radius.md,
                          backgroundColor: theme.surface,
                          borderWidth: 1,
                          borderColor: lesson.completedAt ? theme.positive + '55' : theme.border,
                        }}>
                        <View
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: radius.sm,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: lesson.completedAt
                              ? theme.positiveSoft
                              : tint + '1A',
                          }}>
                          {lesson.completedAt ? (
                            <IconCheck color={theme.positive} size={16} />
                          ) : (
                            <View
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: tint,
                              }}
                            />
                          )}
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text variant="bodyStrong">{lesson.title}</Text>
                          <Text variant="caption" tone="textFaint" numberOfLines={1}>
                            {lesson.hook}
                          </Text>
                        </View>
                        <Text variant="caption" tone="textFaint">
                          {Math.round(readSeconds(lesson))}s
                        </Text>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </Stack>
          </Animated.View>
        ))}
      </Stack>

      <Spacer />
    </Screen>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          paddingHorizontal: space.md,
          paddingVertical: space.sm - 1,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: active ? theme.accent : theme.border,
          backgroundColor: active ? theme.accentSoft : theme.surface,
        }}>
        <Text variant="caption" tone={active ? 'accent' : 'textMuted'}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
