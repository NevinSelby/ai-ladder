import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { View } from 'react-native';

import { Bar, Card, Chip, Divider, Eyebrow, Row, Screen, Spacer, Stack, Text } from '@/components/ui';
import {
  ACCOUNTS_BY_ID,
  expectationsBand,
  healthBand,
  PHASE_META,
  type AccountPhase,
} from '@/content/accounts';
import { IconInfo } from '@/components/icons';
import { Breathe, OrbitRing } from '@/components/ambient';
import { Tappable } from '@/components/tappable';
import { db } from '@/db';
import { useRefreshAppState } from '@/hooks/use-app-state';
import { accounts as accountsTable } from '@/db/schema';
import { radius, space, useTheme } from '@/theme';

/**
 * The Account Board.
 *
 * Read-only in this phase: the accounts exist, carry their real constraints,
 * and show a starting health. Sessions start moving these bars once the
 * judgment modes land, which is when overpromising acquires a visible cost.
 */
export default function BoardScreen() {
  const theme = useTheme();
  const refresh = useRefreshAppState();
  const { data: rows = [] } = useQuery({
    queryKey: ['app-state', 'board'],
    queryFn: () => db.select().from(accountsTable),
    placeholderData: [],
  });

  // Account health moves as sessions land, so re-read it on every visit.
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return (
    <Screen>
      <Spacer size={space.sm} />
      <Stack gap={space.xs}>
        <Eyebrow>Meridian AI · Field</Eyebrow>
        <Text variant="display">The Board</Text>
        <Text variant="small" tone="textMuted">
          Four pretend customers you are deployed to. Their health rises and falls with the
          calls you make in practice.
        </Text>
      </Stack>

      <Spacer size={space.lg} />

      <WhatIsThis />

      <Spacer size={space.lg} />

      <Stack gap={space.lg}>
        {rows.map((row) => {
          const account = ACCOUNTS_BY_ID[row.id];
          if (!account) return null;

          const health = healthBand(row.health);
          const expectations = expectationsBand(row.expectations);
          const healthColor =
            health.tone === 'good' ? theme.positive : health.tone === 'warn' ? theme.warning : theme.negative;
          const expectationsColor =
            expectations.tone === 'good'
              ? theme.positive
              : expectations.tone === 'warn'
                ? theme.warning
                : theme.negative;

          return (

            <Pressable key={account.id} onPress={() => router.push({ pathname: '/account/[id]', params: { id: account.id } })}>

            <Card key={row.id} accent={account.accent}>
              <Stack gap={space.md}>
                <Row gap={space.md} align="flex-start">
                  <Breathe amount={0.04} period={4200}>
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: radius.md,
                        backgroundColor: account.accent + '22',
                        borderWidth: 1,
                        borderColor: account.accent + '55',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      {/* A spark circling the monogram: the account is running. */}
                      <OrbitRing size={42} color={account.accent} duration={11000} dot={3} />
                      <Text variant="numericSm" color={account.accent}>
                        {account.monogram}
                      </Text>
                    </View>
                  </Breathe>

                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyStrong">{account.name}</Text>
                    <Text variant="caption" tone="textFaint">
                      {account.industry}
                    </Text>
                  </View>

                  <Chip label={PHASE_META[row.phase as AccountPhase]?.label ?? row.phase} color={account.accent} filled />
                </Row>

                <Text variant="small" tone="textMuted">
                  {account.hardPart}
                </Text>

                <Stack gap={space.sm}>
                  <MeterRow label="Health" value={row.health} color={healthColor} note={health.label} />
                  <MeterRow
                    label="Expectations"
                    value={row.expectations}
                    color={expectationsColor}
                    note={expectations.label}
                    inverted
                  />
                </Stack>

                <Divider />

                <Row gap={space.xs} wrap>
                  {account.constraints.map((constraint) => (
                    <Chip key={constraint} label={constraint} color={theme.textFaint} />
                  ))}
                </Row>
              </Stack>
            </Card>
            </Pressable>
          );
        })}
      </Stack>

      <Spacer size={space.lg} />
      <Text variant="caption" tone="textFaint" center>
        Expectations only rise when you promise more than you can hold. A hot bar makes every
        later session on that account harder.
      </Text>
      <Spacer />
    </Screen>
  );
}

function MeterRow({
  label,
  value,
  color,
  note,
  inverted,
}: {
  label: string;
  value: number;
  color: string;
  note: string;
  inverted?: boolean;
}) {
  return (
    <View style={{ gap: 5 }}>
      <Row justify="space-between" align="baseline">
        <Text variant="caption" tone="textMuted">
          {label}
        </Text>
        <Text variant="caption" color={color}>
          {note} · {value}
        </Text>
      </Row>
      <Bar value={value / 100} color={color} height={5} />
      {inverted ? null : null}
    </View>
  );
}


/**
 * What the Board is for.
 *
 * The concept needs explaining because it is the one part of the app that is
 * not self-evident from its own screen: a list of fictional companies with
 * health bars means nothing until you know they are the scoreboard for
 * judgment, not knowledge. Collapsed after the first read so it stops being an
 * obstacle once the point has landed.
 */
function WhatIsThis() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Card level={0} style={{ backgroundColor: theme.accentSoft, borderColor: 'transparent' }}>
      <Tappable onPress={() => setOpen((v) => !v)} accessibilityLabel="What is the Board" scaleOnPress={false}>
        <Row justify="space-between" align="center">
          <Row gap={space.sm} align="center">
            <IconInfo color={theme.accent} size={17} />
            <Text variant="smallStrong" tone="accent">
              What is the Board?
            </Text>
          </Row>
          <Text variant="caption" tone="accent">
            {open ? 'Hide' : 'Read'}
          </Text>
        </Row>
      </Tappable>

      {open ? (
        <Animated.View entering={FadeIn.duration(220)} style={{ marginTop: space.md, gap: space.md }}>
          <Text variant="small">
            Quizzes test what you know. They cannot test whether you would have kept a customer.
            The Board is where that second thing gets measured.
          </Text>
          <Text variant="small">
            You work at Meridian AI, a fictional company, and you are deployed to four accounts.
            Each one is stuck on a different hard part of the job: PHI that cannot leave the
            building, three merged systems that disagree about what fraud means, a regulator
            watching, a customer already burned by another vendor.
          </Text>
          <Text variant="small">
            Every account carries two bars. <Text variant="smallStrong">Health</Text> is how well
            the engagement is going. <Text variant="smallStrong">Expectations</Text> is how much
            you have promised, and it only ever goes up when you overpromise. A high expectations
            bar makes every later session harder to pass, which is the honest simulation of what
            overpromising actually costs you.
          </Text>
          <Text variant="small" tone="textMuted">
            Open an account to see its constraints and the full history of what moved it.
          </Text>
        </Animated.View>
      ) : null}
    </Card>
  );
}
