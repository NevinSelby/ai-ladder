import { router } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aurora, Stagger } from '@/components/surface';
import { IconBoard, IconLearn, IconToday } from '@/components/icons';
import { LadderMark } from '@/components/logo';
import { Button, Row, Stack, Text } from '@/components/ui';
import { MAX_TEXT_WIDTH, motion, radius, space, useTheme } from '@/theme';

/**
 * The front door.
 *
 * The app now requires an account, so this is the first thing anyone sees. It
 * has one job: say what this is in a sentence someone can evaluate, then get
 * out of the way. Marketing pages persuade; a front door for a tool should
 * mostly just open.
 */
export default function WelcomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const inner = Math.min(width, MAX_TEXT_WIDTH) - space.lg * 2;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Aurora width={width} height={height * 0.55} opacity={0.14} radius={0} />

      <View
        style={{
          flex: 1,
          paddingTop: insets.top + space.xxxl,
          paddingBottom: Math.max(insets.bottom, space.xl),
          paddingHorizontal: space.lg,
          maxWidth: MAX_TEXT_WIDTH,
          alignSelf: 'center',
          width: '100%',
        }}>
        <Stagger index={0}>
          <LadderMark size={56} color={theme.accent} topColor={theme.accent} />
        </Stagger>

        <View style={{ height: space.xl }} />

        <Stagger index={1}>
          <Text variant="hero">
            Practice the job,{'\n'}not the trivia.
          </Text>
        </Stagger>

        <View style={{ height: space.lg }} />

        <Stagger index={2}>
          <Text variant="body" tone="textMuted">
            Daily practice for forward deployed engineers, solutions architects and AI
            engineers. Short sessions on the things these roles are actually scored on:
            judgment under constraints, not recall.
          </Text>
        </Stagger>

        <View style={{ height: space.xxl }} />

        <Stack gap={space.lg}>
          {[
            {
              Icon: IconToday,
              title: 'A few minutes a day',
              body: 'Spaced repetition decides what to ask, so you review things just before you would forget them.',
            },
            {
              Icon: IconLearn,
              title: 'Ninety-second theory',
              body: 'One idea per card: what it is, the decision it drives, and the part people get wrong.',
            },
            {
              Icon: IconBoard,
              title: 'Four pretend customers',
              body: 'Accounts whose health moves with your judgment calls, not with your score.',
            },
          ].map((row, i) => (
            <Stagger key={row.title} index={3 + i}>
              <Row gap={space.md} align="flex-start">
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: radius.md,
                    backgroundColor: theme.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <row.Icon color={theme.accent} size={18} />
                </View>
                <Stack gap={2} style={{ flex: 1 }}>
                  <Text variant="smallStrong">{row.title}</Text>
                  <Text variant="caption" tone="textMuted">
                    {row.body}
                  </Text>
                </Stack>
              </Row>
            </Stagger>
          ))}
        </Stack>

        <View style={{ flex: 1, minHeight: space.xl }} />

        <Animated.View entering={FadeInDown.duration(motion.slow).delay(320)}>
          <Stack gap={space.sm}>
            <Button
              title="Create an account"
              size="lg"
              full
              onPress={() => router.push({ pathname: '/auth', params: { mode: 'signup' } })}
            />
            <Button
              title="I already have one"
              kind="ghost"
              full
              onPress={() => router.push({ pathname: '/auth', params: { mode: 'signin' } })}
            />
          </Stack>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(motion.slow).delay(420)}>
          <Text
            variant="caption"
            tone="textFaint"
            center
            style={{ marginTop: space.md, maxWidth: inner }}>
            An account keeps your streak, history and progress on every device you sign in
            on.
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
