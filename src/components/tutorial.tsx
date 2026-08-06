import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DifficultyTag } from '@/components/difficulty-tag';
import {
  IconBoard,
  IconLearn,
  IconPractice,
  IconProgress,
  IconToday,
  IconUser,
} from '@/components/icons';
import { LadderMark } from '@/components/logo';
import { StreakFlame } from '@/components/streak-flame';
import { Tappable } from '@/components/tappable';
import { Button, Row, Stack, Text } from '@/components/ui';
import { MAX_CONTENT_WIDTH, radius, space, useTheme, type Palette } from '@/theme';
import { useMotion } from '@/theme/motion-prefs';

/**
 * The first-run tour.
 *
 * Six swipeable slides naming each tab and the one idea behind the app,
 * skippable from the first frame. It exists because the tab bar answers
 * "where can I go" but not "why would I": a new user seeing Board for the
 * first time has no way to know it is a judgment scoreboard rather than a
 * leaderboard.
 *
 * Seen-state lives in AsyncStorage, not the profile row: it is device-level
 * UX state like remember-me, and resetting progress should not replay the
 * tour at someone who already knows the app.
 */

const SEEN_KEY = 'ailadder.tutorialSeen.v1';

const TutorialContext = createContext<{ open: () => void }>({ open: () => {} });
export const useTutorial = () => useContext(TutorialContext);

export function TutorialProvider({ children }: { children: ReactNode }) {
  // null = still reading storage; render nothing rather than flashing a tour
  // at someone who has already seen it.
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY)
      .then((seen) => setVisible(seen === null))
      .catch(() => setVisible(false));
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    AsyncStorage.setItem(SEEN_KEY, 'true').catch(() => {});
  }, []);

  const open = useCallback(() => setVisible(true), []);

  return (
    <TutorialContext.Provider value={{ open }}>
      {children}
      {visible === true ? <Tour onClose={close} /> : null}
    </TutorialContext.Provider>
  );
}

// ── Slides ─────────────────────────────────────────────────────────────────

interface Slide {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  art: (theme: Palette) => ReactNode;
}

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    eyebrow: 'Welcome',
    title: 'AI Ladder',
    body: 'Daily practice for forward deployed engineers, solutions architects and AI engineers. Three minutes a day, aimed at what those roles actually test: judgment, not just recall.',
    art: (theme) => <LadderMark size={72} color={theme.accent} topColor={theme.accent} />,
  },
  {
    key: 'today',
    eyebrow: 'The Today tab',
    title: 'One session a day',
    body: 'A short quiz sized to your goal. Finishing lights the flame and keeps your streak, and spaced repetition decides what to ask so you review things right before you would forget them. Three daily quests sit underneath, small goals that pay points.',
    art: () => <StreakFlame days={7} lit showCount />,
  },
  {
    key: 'learn',
    eyebrow: 'The Learn tab',
    title: 'Theory in ninety seconds',
    body: 'Short cards on one idea each: what it is, the decision it drives in the field, and the part people get wrong. Read one before a customer call, not a textbook chapter the night before.',
    art: (theme) => <IconLearn color={theme.accent} size={64} />,
  },
  {
    key: 'practice',
    eyebrow: 'The Practice tab',
    title: 'Harder pays more',
    body: 'Every question carries a difficulty tag, visible before you answer. Expert questions pay more than three times what Easy ones do, so you always know what a hard one is worth.',
    art: () => (
      <Stack gap={space.sm} style={{ alignItems: 'center' }}>
        <DifficultyTag difficulty="core" showXp />
        <DifficultyTag difficulty="edge" showXp />
      </Stack>
    ),
  },
  {
    key: 'board',
    eyebrow: 'The Board tab',
    title: 'Four pretend customers',
    body: 'Quizzes measure what you know. The Board measures whether you would have kept the customer: four fictional accounts whose health rises and falls with the judgment calls you make.',
    art: (theme) => <IconBoard color={theme.accent} size={64} />,
  },
  {
    key: 'progress',
    eyebrow: 'Progress and Profile',
    title: 'Watch yourself climb',
    body: 'Progress shows your rung on the ladder, five craft meters, your practice history and the leaderboard, where friends with accounts appear. The profile icon, top right, holds your account, settings and sign out. Your level is gated by your weakest meter, so the app pushes you toward what you avoid.',
    art: (theme) => (
      <Row gap={space.lg} align="center">
        <IconProgress color={theme.accent} size={52} />
        <IconUser color={theme.accent} size={52} />
      </Row>
    ),
  },
];

// ── The pager ──────────────────────────────────────────────────────────────

function Tour({ onClose }: { onClose: () => void }) {
  const theme = useTheme();
  const motion = useMotion();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pageWidth = Math.min(width, MAX_CONTENT_WIDTH);

  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const last = index === SLIDES.length - 1;

  const goTo = (next: number) => {
    scroller.current?.scrollTo({ x: next * pageWidth, animated: !motion.reduced });
    setIndex(next);
  };

  return (
    <Animated.View
      entering={motion.reduced ? undefined : FadeIn.duration(motion.base)}
      style={{ position: 'absolute', inset: 0, zIndex: 1000, elevation: 24 }}>
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          paddingTop: insets.top + space.md,
          paddingBottom: Math.max(insets.bottom, space.lg),
        }}>
        {/* Skip is present from the first frame: a tour you cannot leave is a
            gate, and gates get force-quit. */}
        <View style={{ paddingHorizontal: space.lg, alignItems: 'flex-end' }}>
          <Tappable onPress={onClose} accessibilityLabel="Skip the tour" height={36}>
            <Text variant="smallStrong" tone="textFaint">
              Skip
            </Text>
          </Tappable>
        </View>

        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) =>
            setIndex(Math.round(event.nativeEvent.contentOffset.x / pageWidth))
          }
          style={{ flex: 1, alignSelf: 'center', width: pageWidth }}>
          {SLIDES.map((slide) => (
            <View
              key={slide.key}
              style={{
                width: pageWidth,
                paddingHorizontal: space.xl,
                justifyContent: 'center',
                gap: space.xl,
              }}>
              <Animated.View
                entering={FadeInDown.duration(motion.slow)}
                style={{
                  alignSelf: 'center',
                  width: 148,
                  height: 148,
                  borderRadius: 74,
                  backgroundColor: theme.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {slide.art(theme)}
              </Animated.View>

              <Animated.View entering={FadeIn.duration(motion.slow).delay(80 * motion.stagger)}>
                <Stack gap={space.sm} style={{ alignItems: 'center' }}>
                  <Text variant="eyebrow" tone="accent">
                    {slide.eyebrow.toUpperCase()}
                  </Text>
                  <Text variant="title" center>
                    {slide.title}
                  </Text>
                  <Text variant="body" tone="textMuted" center>
                    {slide.body}
                  </Text>
                </Stack>
              </Animated.View>
            </View>
          ))}
        </ScrollView>

        <Stack gap={space.lg} style={{ paddingHorizontal: space.xl, alignItems: 'center' }}>
          <Row gap={space.xs}>
            {SLIDES.map((slide, dot) => (
              <Dot key={slide.key} active={dot === index} />
            ))}
          </Row>
          <View style={{ width: '100%', maxWidth: 420 }}>
            <Button
              title={last ? 'Get started' : 'Next'}
              size="lg"
              full
              onPress={() => (last ? onClose() : goTo(index + 1))}
            />
          </View>
        </Stack>
      </View>
    </Animated.View>
  );
}

/** The active dot stretches rather than only recoloring, so position is
 *  legible without depending on hue. */
function Dot({ active }: { active: boolean }) {
  const theme = useTheme();
  const motion = useMotion();
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? 22 : 7, { duration: motion.base }),
    backgroundColor: withTiming(active ? theme.accent : theme.borderStrong, {
      duration: motion.base,
    }),
  }));
  return <Animated.View style={[{ height: 7, borderRadius: 4 }, style]} />;
}
