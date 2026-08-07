import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '@/lib/navigation';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Diagram } from '@/components/diagrams';
import { IconArrowRight, IconCheck, IconLink } from '@/components/icons';
import { Button, Card, Chip, Divider, Eyebrow, Row, Stack, Text } from '@/components/ui';
import { LESSONS_BY_ID } from '@/content/lessons';
import { completeLesson, isLessonComplete } from '@/data/learning';
import { successHaptic } from '@/lib/haptics';
import { db } from '@/db';
import { useRefreshAppState } from '@/hooks/use-app-state';
import {
  MAX_CONTENT_WIDTH,
  meterColor,
  motion,
  radius,
  space,
  useScheme,
  useTheme,
} from '@/theme';
import { LESSON_BLOCKS, LESSON_BLOCK_META, readSeconds } from '@shared/lessons';
import { TAXONOMY_BY_ID } from '@shared/taxonomy';

/**
 * The lesson reader.
 *
 * Three labeled blocks rather than continuous prose, because at this length a
 * paragraph blurs and a reader who half-knows the topic wants to jump straight
 * to the catch. Blocks fade in staggered so the page assembles rather than
 * appearing, which makes a short read feel considered instead of thin.
 */
export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const refresh = useRefreshAppState();

  const lesson = id ? LESSONS_BY_ID[id] : undefined;
  const [done, setDone] = useState(false);
  const openedAt = useRef(Date.now());

  useEffect(() => {
    if (!id) return;
    openedAt.current = Date.now();
    isLessonComplete(db, id).then(setDone);
  }, [id]);

  if (!lesson) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: space.xl, paddingTop: insets.top + space.xxl }}>
        <Text variant="heading">Lesson not found</Text>
        <Text variant="small" tone="textMuted">
          It may have been renamed. Go back and pick another.
        </Text>
      </View>
    );
  }

  // Diagrams may use the full reading column; the prose above stays narrower.
  const diagramWidth = Math.min(width, MAX_CONTENT_WIDTH) - space.lg * 4;
  const primaryNode = TAXONOMY_BY_ID[lesson.nodeIds[0]];
  const tint = primaryNode ? meterColor(primaryNode.meter, scheme) : theme.accent;

  const finish = async () => {
    const seconds = Math.round((Date.now() - openedAt.current) / 1000);
    successHaptic();
    await completeLesson(db, lesson.id, seconds);
    setDone(true);
    refresh();
    goBack('/learn');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top + space.sm }}>
      <View style={{ paddingHorizontal: space.lg }}>
        <Row justify="space-between" align="center">
          <Pressable onPress={() => goBack('/learn')} hitSlop={12}>
            <Text variant="eyebrow" tone="textFaint">
              CLOSE
            </Text>
          </Pressable>
          <Row gap={space.xs} align="center">
            {done ? <Chip label="read" color={theme.positive} filled /> : null}
            <Text variant="eyebrow" tone="textFaint">
              {Math.round(readSeconds(lesson))}S READ
            </Text>
          </Row>
        </Row>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: space.lg,
          paddingBottom: space.xxxl * 2,
          maxWidth: MAX_CONTENT_WIDTH,
          alignSelf: 'center',
          width: '100%',
          gap: space.lg,
        }}
        showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(motion.slow)}>
          <Stack gap={space.sm}>
            <Row gap={space.xs} wrap>
              {lesson.nodeIds.slice(0, 3).map((nodeId) => {
                const node = TAXONOMY_BY_ID[nodeId];
                if (!node) return null;
                return (
                  <Chip key={nodeId} label={node.label} color={meterColor(node.meter, scheme)} />
                );
              })}
            </Row>
            <Text variant="display">{lesson.title}</Text>
            <Text variant="body" tone="textMuted">
              {lesson.hook}
            </Text>
          </Stack>
        </Animated.View>

        {lesson.diagramId ? (
          <Animated.View entering={FadeIn.duration(motion.slow).delay(140)}>
            <Card padded={false}>
              <View style={{ padding: space.lg }}>
                <Diagram id={lesson.diagramId} width={diagramWidth} />
              </View>
            </Card>
          </Animated.View>
        ) : null}

        {LESSON_BLOCKS.map((block, index) => (
          <Animated.View
            key={block}
            entering={FadeInDown.duration(motion.slow).delay(200 + index * 90)}>
            <Stack gap={space.sm}>
              <Row gap={space.sm} align="center">
                <View style={{ width: 3, height: 15, borderRadius: 2, backgroundColor: tint }} />
                <Eyebrow tone="text">{LESSON_BLOCK_META[block].label}</Eyebrow>
              </Row>
              <Text variant="body">{lesson[block]}</Text>
            </Stack>
          </Animated.View>
        ))}

        <Animated.View entering={FadeInDown.duration(motion.slow).delay(480)}>
          <Card accent={tint}>
            <Stack gap={space.md}>
              <Eyebrow>Worth remembering</Eyebrow>
              {lesson.keyPoints.map((point, index) => (
                <Row key={point} gap={space.md} align="flex-start">
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: radius.sm - 4,
                      backgroundColor: tint + '22',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 3,
                    }}>
                    <Text variant="caption" color={tint}>
                      {index + 1}
                    </Text>
                  </View>
                  <Text variant="small" style={{ flex: 1 }}>
                    {point}
                  </Text>
                </Row>
              ))}
            </Stack>
          </Card>
        </Animated.View>

        {lesson.citations.length > 0 ? (
          <Animated.View entering={FadeIn.duration(motion.slow).delay(560)}>
            <Stack gap={space.sm}>
              <Divider />
              {lesson.citations.map((citation) => (
                <Pressable
                  key={citation.url}
                  hitSlop={6}
                  onPress={() => Linking.openURL(citation.url).catch(() => {})}>
                  <Row gap={space.sm} align="center">
                    <IconLink color={theme.accent} size={14} />
                    <Text variant="caption" tone="accent" style={{ flex: 1 }}>
                      {citation.title}
                    </Text>
                  </Row>
                </Pressable>
              ))}
            </Stack>
          </Animated.View>
        ) : null}
      </ScrollView>

      <Animated.View
        entering={FadeInUp.duration(motion.slow).delay(300)}
        style={{
          padding: space.lg,
          paddingBottom: Math.max(insets.bottom, space.lg),
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.surface,
        }}>
        <View style={{ maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', width: '100%' }}>
          <Button
            title={done ? 'Read again' : 'Mark as read'}
            kind={done ? 'secondary' : 'primary'}
            size="lg"
            full
            onPress={done ? () => goBack('/learn') : finish}
            right={
              done ? (
                <IconCheck color={theme.text} size={18} />
              ) : (
                <IconArrowRight color={theme.accentText} size={18} />
              )
            }
          />
        </View>
      </Animated.View>
    </View>
  );
}
