import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '@/lib/navigation';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Breathe } from '@/components/ambient';
import { IconArrowLeft, IconLearn, IconPractice } from '@/components/icons';
import { Bar, Button, Card, Chip, Divider, Eyebrow, Row, Stack, Text } from '@/components/ui';
import { LESSONS } from '@/content/lessons';
import { topicDetail } from '@/data/topics';
import { db } from '@/db';
import { MAX_CONTENT_WIDTH, motion, radius, space, useTheme } from '@/theme';
import { BRANCH_META, TAXONOMY_BY_ID } from '@shared/taxonomy';

/**
 * A single topic, addressable by URL.
 *
 * `/topic/gcp.vpcsc` is bookmarkable, linkable and shareable, which is what a
 * website affords and a phone app does not. It shows what the concept is, how
 * you have done on it, whether it is currently a leech, and offers the lesson
 * and a targeted drill.
 *
 * The id is validated against the taxonomy before anything is queried. An
 * unknown id renders a not-found state rather than reaching the database,
 * which keeps a hand-edited URL from becoming a query parameter.
 */
export default function TopicScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();

  const id = typeof params.id === 'string' ? params.id : '';
  const node = TAXONOMY_BY_ID[id];

  const { data: detail } = useQuery({
    queryKey: ['app-state', 'topic', id],
    queryFn: () => topicDetail(db, id),
    enabled: Boolean(node),
    placeholderData: { attempts: 0, accuracy: 0, itemCount: 0, suspended: false, due: null },
  });

  const lesson = LESSONS.find((entry) => entry.nodeIds.includes(id));

  if (!node) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          padding: space.xl,
          paddingTop: insets.top + space.xxl,
        }}>
        <Stack gap={space.md}>
          <Eyebrow>Not found</Eyebrow>
          <Text variant="heading">No such topic</Text>
          <Text variant="small" tone="textMuted">
            There is no concept with the id "{id.slice(0, 60)}". It may have been renamed.
          </Text>
          <Button title="Back" size="lg" full onPress={() => goBack('/practice')} />
        </Stack>
      </View>
    );
  }

  const branch = BRANCH_META[node.branch];
  const stats = detail ?? { attempts: 0, accuracy: 0, itemCount: 0, suspended: false, due: null };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top + space.sm }}>
      <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
        <Pressable
          onPress={() => goBack('/practice')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.md,
            backgroundColor: theme.elevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <IconArrowLeft color={theme.text} size={19} />
        </Pressable>
      </View>

      <View
        style={{
          padding: space.lg,
          gap: space.lg,
          maxWidth: MAX_CONTENT_WIDTH,
          width: '100%',
          alignSelf: 'center',
        }}>
        <Animated.View entering={FadeInDown.duration(motion.slow)}>
          <Stack gap={space.sm}>
            <Row gap={space.sm} align="center">
              <Chip label={branch.label} color={theme.accent} />
              {node.cloud !== 'neutral' ? (
                <Chip label={node.cloud.toUpperCase()} color={theme.textFaint} />
              ) : null}
              {stats.suspended ? <Chip label="paused" color={theme.warning} filled /> : null}
            </Row>
            <Text variant="display">{node.label}</Text>
            <Text variant="body" tone="textMuted">
              {node.blurb}
            </Text>
          </Stack>
        </Animated.View>

        <Card>
          <Stack gap={space.md}>
            <Row justify="space-between" align="baseline">
              <Eyebrow>Your record</Eyebrow>
              <Text variant="caption" tone="textFaint">
                {stats.itemCount} question{stats.itemCount === 1 ? '' : 's'} in the bank
              </Text>
            </Row>

            {stats.attempts === 0 ? (
              <Text variant="small" tone="textMuted">
                You have not been asked about this yet.
              </Text>
            ) : (
              <>
                <Row justify="space-between" align="center">
                  <Text variant="small" tone="textMuted">
                    {stats.attempts} attempt{stats.attempts === 1 ? '' : 's'}
                  </Text>
                  <Text variant="numericSm">{Math.round(stats.accuracy * 100)}%</Text>
                </Row>
                <Bar
                  value={stats.accuracy}
                  color={
                    stats.accuracy >= 0.8
                      ? theme.positive
                      : stats.accuracy >= 0.5
                        ? theme.warning
                        : theme.negative
                  }
                  height={8}
                />
              </>
            )}

            {stats.suspended ? (
              <View
                style={{
                  backgroundColor: theme.warningSoft,
                  borderRadius: radius.md,
                  padding: space.md,
                }}>
                <Text variant="caption" tone="textMuted">
                  This concept is paused. It was missed enough times that repeating it was not
                  teaching anything. Read the lesson, then resume it from Progress.
                </Text>
              </View>
            ) : null}
          </Stack>
        </Card>

        {lesson ? (
          <Pressable onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}>
            <Card>
              <Row gap={space.md} align="center">
                <Breathe amount={0.05} period={3600}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: theme.accentSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <IconLearn color={theme.accent} size={20} />
                  </View>
                </Breathe>
                <Stack gap={2} style={{ flex: 1 }}>
                  <Text variant="smallStrong">{lesson.title}</Text>
                  <Text variant="caption" tone="textFaint">
                    Ninety seconds on this exact idea.
                  </Text>
                </Stack>
              </Row>
            </Card>
          </Pressable>
        ) : null}

        <Button
          title="Practice this topic"
          size="lg"
          full
          disabled={stats.itemCount === 0}
          onPress={() => router.push({ pathname: '/session/drill', params: { node: id } })}
          right={<IconPractice color={theme.accentText} size={17} />}
        />
        {stats.itemCount === 0 ? (
          <Text variant="caption" tone="textFaint" center>
            No questions cover this yet.
          </Text>
        ) : null}
      </View>
    </View>
  );
}
