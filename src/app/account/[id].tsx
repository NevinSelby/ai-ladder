import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconCheck, IconCross } from '@/components/icons';
import { Bar, Card, Chip, Divider, Eyebrow, Row, Stack, Text } from '@/components/ui';
import { ACCOUNTS_BY_ID, PHASE_META, expectationsBand, healthBand } from '@/content/accounts';
import { accountRow, accountTimeline } from '@/data/accounts';
import { db } from '@/db';
import { MAX_CONTENT_WIDTH, motion, radius, space, useTheme } from '@/theme';

/**
 * Account detail.
 *
 * The board's whole point is that practice has consequences you can trace. So
 * this screen leads with the two bars and then shows, entry by entry, exactly
 * which question moved them and what you answered. A slip is only instructive
 * if you can see the moment it happened.
 */
export default function AccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const account = id ? ACCOUNTS_BY_ID[id] : undefined;

  const { data: row } = useQuery({
    queryKey: ['app-state', 'account', id],
    queryFn: () => (id ? accountRow(db, id) : null),
    enabled: Boolean(id),
  });
  const { data: timeline = [] } = useQuery({
    queryKey: ['app-state', 'timeline', id],
    queryFn: () => (id ? accountTimeline(db, id) : []),
    placeholderData: [],
    enabled: Boolean(id),
  });

  if (!account) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: space.xl, paddingTop: insets.top + space.xxl }}>
        <Text variant="heading">Account not found</Text>
      </View>
    );
  }

  const health = row?.health ?? 70;
  const expectations = row?.expectations ?? 40;
  const phase = (row?.phase ?? 'discovery') as keyof typeof PHASE_META;
  const hb = healthBand(health);
  const eb = expectationsBand(expectations);

  const tone = (band: 'good' | 'warn' | 'bad') =>
    band === 'good' ? theme.positive : band === 'warn' ? theme.warning : theme.negative;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top + space.sm }}>
      <View style={{ paddingHorizontal: space.lg }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text variant="eyebrow" tone="textFaint">
            CLOSE
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: space.lg,
          paddingBottom: insets.bottom + space.xxxl,
          gap: space.md,
          maxWidth: MAX_CONTENT_WIDTH,
          alignSelf: 'center',
          width: '100%',
        }}
        showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <Animated.View entering={FadeInDown.duration(motion.slow)}>
          <Stack gap={space.sm}>
            <Row gap={space.md} align="center">
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.md,
                  backgroundColor: account.accent + '22',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text variant="numericSm" color={account.accent}>
                  {account.monogram}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="title">{account.name}</Text>
                <Text variant="caption" tone="textFaint">
                  {account.industry}
                </Text>
              </View>
            </Row>
            <Text variant="small" tone="textMuted">
              {account.hardPart}
            </Text>
          </Stack>
        </Animated.View>

        {/* ── Bars ── */}
        <Animated.View entering={FadeInDown.duration(motion.slow).delay(60)}>
          <Card accent={account.accent}>
            <Stack gap={space.lg}>
              <Row justify="space-between" align="center">
                <Eyebrow>{PHASE_META[phase].label}</Eyebrow>
                <Chip label={row?.status ?? 'active'} color={theme.textFaint} />
              </Row>
              <Text variant="caption" tone="textFaint">
                {PHASE_META[phase].blurb}
              </Text>

              <Stack gap={space.sm}>
                <Row justify="space-between" align="baseline">
                  <Text variant="smallStrong">Engagement health</Text>
                  <Text variant="numericSm" color={tone(hb.tone)}>
                    {health}
                  </Text>
                </Row>
                <Bar value={health / 100} color={tone(hb.tone)} height={9} />
                <Text variant="caption" tone="textFaint">
                  {hb.label}, rises when you get this account&apos;s topics right.
                </Text>
              </Stack>

              <Stack gap={space.sm}>
                <Row justify="space-between" align="baseline">
                  <Text variant="smallStrong">Expectations</Text>
                  <Text variant="numericSm" color={tone(eb.tone)}>
                    {expectations}
                  </Text>
                </Row>
                <Bar value={expectations / 100} color={tone(eb.tone)} height={9} />
                <Text variant="caption" tone="textFaint">
                  {eb.label}, rises when you miss a question about setting or managing
                  expectations. High expectations hold the account in its current phase.
                </Text>
              </Stack>
            </Stack>
          </Card>
        </Animated.View>

        {/* ── Constraints ── */}
        <Animated.View entering={FadeInDown.duration(motion.slow).delay(120)}>
          <Card>
            <Stack gap={space.sm}>
              <Eyebrow>Constraints</Eyebrow>
              {account.constraints.map((constraint) => (
                <Row key={constraint} gap={space.sm} align="flex-start">
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 2.5,
                      backgroundColor: account.accent,
                      marginTop: 9,
                    }}
                  />
                  <Text variant="small" style={{ flex: 1 }}>
                    {constraint}
                  </Text>
                </Row>
              ))}
            </Stack>
          </Card>
        </Animated.View>

        {/* ── Timeline ── */}
        <Animated.View entering={FadeInDown.duration(motion.slow).delay(180)}>
          <Eyebrow>What moved the bars</Eyebrow>
        </Animated.View>

        {timeline.length === 0 ? (
          <Card>
            <Text variant="small" tone="textMuted">
              Nothing yet. Answer questions about {account.industry.toLowerCase()} topics, the
              ones this account leans on, and each answer will appear here with what it cost or
              earned.
            </Text>
          </Card>
        ) : (
          timeline.map((entry, index) => {
            const good = entry.healthDelta > 0;
            const bad = entry.healthDelta < 0 || entry.expectationsDelta > 0;
            const tint = good ? theme.positive : bad ? theme.negative : theme.textMuted;

            return (
              <Animated.View
                key={entry.id}
                entering={FadeIn.duration(motion.base).delay(Math.min(index, 8) * 40)}>
                <Card accent={tint}>
                  <Stack gap={space.sm}>
                    <Row justify="space-between" align="center">
                      <Row gap={space.sm} align="center">
                        {entry.kind === 'phase' ? (
                          <Chip label="phase" color={theme.accent} filled />
                        ) : good ? (
                          <IconCheck color={theme.positive} size={16} />
                        ) : (
                          <IconCross color={theme.negative} size={16} />
                        )}
                        <Text variant="smallStrong" color={tint}>
                          {entry.summary}
                        </Text>
                      </Row>
                      <Row gap={space.xs}>
                        {entry.healthDelta !== 0 ? (
                          <Chip
                            label={`${entry.healthDelta > 0 ? '+' : ''}${entry.healthDelta} health`}
                            color={entry.healthDelta > 0 ? theme.positive : theme.negative}
                            filled
                          />
                        ) : null}
                        {entry.expectationsDelta !== 0 ? (
                          <Chip
                            label={`${entry.expectationsDelta > 0 ? '+' : ''}${entry.expectationsDelta} exp`}
                            color={entry.expectationsDelta > 0 ? theme.warning : theme.positive}
                            filled
                          />
                        ) : null}
                      </Row>
                    </Row>

                    {entry.question ? (
                      <>
                        <Divider />
                        <Text variant="small">{entry.question}</Text>
                        {entry.yourAnswer ? (
                          <Row gap={space.sm} align="flex-start">
                            <Text variant="caption" tone="textFaint" style={{ width: 52 }}>
                              You said
                            </Text>
                            <Text variant="caption" color={good ? theme.positive : theme.negative} style={{ flex: 1 }}>
                              {entry.yourAnswer}
                            </Text>
                          </Row>
                        ) : null}
                        {!good && entry.correctAnswer ? (
                          <Row gap={space.sm} align="flex-start">
                            <Text variant="caption" tone="textFaint" style={{ width: 52 }}>
                              Should be
                            </Text>
                            <Text variant="caption" tone="positive" style={{ flex: 1 }}>
                              {entry.correctAnswer}
                            </Text>
                          </Row>
                        ) : null}
                        {!good && entry.explanation ? (
                          <Text variant="caption" tone="textMuted">
                            {entry.explanation}
                          </Text>
                        ) : null}
                      </>
                    ) : null}
                  </Stack>
                </Card>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
