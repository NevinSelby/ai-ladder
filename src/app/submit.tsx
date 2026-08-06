import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconArrowLeft, IconCheck } from '@/components/icons';
import { Tappable } from '@/components/tappable';
import { Button, Card, Chip, Divider, Eyebrow, Row, Stack, Text } from '@/components/ui';
import {
  DAILY_SUBMISSION_LIMIT,
  mySubmissions,
  pushSubmissions,
  saveSubmission,
  submissionsToday,
  validateSubmission,
} from '@/data/submissions';
import { db } from '@/db';
import { useAuthSession } from '@/hooks/use-auth';
import { useRefreshAppState } from '@/hooks/use-app-state';
import { MAX_CONTENT_WIDTH, radius, space, useTheme } from '@/theme';
import { DIFFICULTY_META } from '@shared/progression';
import { LIVE_NODES } from '@shared/taxonomy';

/**
 * Write a question.
 *
 * The bar is deliberately the same one the seed bank is held to: a source, a
 * reason for every wrong option, and a real explanation. Most submissions that
 * would be rejected never get sent, because the form says why while you are
 * still writing.
 *
 * Nothing written here reaches another user without human review. The screen
 * says so plainly, because a contributor who expects instant publication and
 * gets silence assumes the feature is broken.
 */
const LETTERS = ['a', 'b', 'c', 'd'];

export default function SubmitScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const refresh = useRefreshAppState();
  const { session } = useAuthSession();

  const [stem, setStem] = useState('');
  const [choices, setChoices] = useState(LETTERS.map((id) => ({ id, text: '', whyWrong: '' })));
  const [correctId, setCorrectId] = useState('a');
  const [explanation, setExplanation] = useState('');
  const [nodeIds, setNodeIds] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState('core');
  const [sourceUrl, setSourceUrl] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const { data: todayCount = 0 } = useQuery({
    queryKey: ['app-state', 'submissions-today'],
    queryFn: () => submissionsToday(db),
    placeholderData: 0,
  });
  const { data: mine = [] } = useQuery({
    queryKey: ['app-state', 'my-submissions'],
    queryFn: () => mySubmissions(db),
    placeholderData: [],
  });

  const draft = { stem, choices, correctId, explanation, nodeIds, difficulty, sourceUrl };
  const problems = useMemo(() => validateSubmission(draft), [draft]);
  const atLimit = todayCount >= DAILY_SUBMISSION_LIMIT;

  const matches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length < 2) return [];
    return LIVE_NODES.filter(
      (node) =>
        node.label.toLowerCase().includes(query) || node.id.toLowerCase().includes(query)
    ).slice(0, 6);
  }, [search]);

  const submit = async () => {
    if (problems.length > 0 || atLimit) return;
    setSaving(true);
    setNote(null);
    try {
      await saveSubmission(db, draft);
      const pushed = await pushSubmissions(db);
      setNote(
        pushed.error === 'not signed in'
          ? 'Saved on this device. Sign in to send it for review.'
          : pushed.error
            ? `Saved locally. Upload failed: ${pushed.error}`
            : 'Sent for review. You will see it here once a reviewer looks at it.'
      );
      setStem('');
      setChoices(LETTERS.map((id) => ({ id, text: '', whyWrong: '' })));
      setExplanation('');
      setNodeIds([]);
      setSourceUrl('');
      refresh();
    } catch (error) {
      setNote(error instanceof Error ? error.message : 'Could not save.');
    }
    setSaving(false);
  };

  const field = {
    fontSize: 15.5,
    color: theme.text,
    backgroundColor: theme.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top + space.sm }}>
      <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
        <Pressable
          onPress={() => router.back()}
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            padding: space.lg,
            paddingBottom: insets.bottom + space.xxxl,
            maxWidth: MAX_CONTENT_WIDTH,
            alignSelf: 'center',
            width: '100%',
            gap: space.lg,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Stack gap={space.xs}>
            <Eyebrow>Contribute</Eyebrow>
            <Text variant="display">Write a question</Text>
            <Text variant="small" tone="textMuted">
              Real interview questions are worth more than generated ones. Everything is
              reviewed by a person before anyone else sees it, so nothing you write here
              appears in someone else's session automatically.
            </Text>
          </Stack>

          {!session ? (
            <Card accent={theme.warning}>
              <Stack gap={space.sm}>
                <Eyebrow tone="warning">Sign in to submit</Eyebrow>
                <Text variant="small" tone="textMuted">
                  Submissions are tied to an account so they can be credited and rate
                  limited. You can still write one now; it stays on this device until you
                  sign in.
                </Text>
              </Stack>
            </Card>
          ) : null}

          <Card>
            <Stack gap={space.lg}>
              <Stack gap={space.xs}>
                <Text variant="smallStrong">The question</Text>
                <TextInput
                  value={stem}
                  onChangeText={setStem}
                  placeholder="A customer requires no public endpoints. What do you propose?"
                  placeholderTextColor={theme.textFaint}
                  multiline
                  maxLength={400}
                  style={{ ...field, minHeight: 84, textAlignVertical: 'top' }}
                />
              </Stack>

              <Stack gap={space.sm}>
                <Row justify="space-between" align="baseline">
                  <Text variant="smallStrong">Options</Text>
                  <Text variant="caption" tone="textFaint">
                    tap the circle to mark the correct one
                  </Text>
                </Row>

                {choices.map((choice, index) => {
                  const isCorrect = correctId === choice.id;
                  return (
                    <Stack key={choice.id} gap={space.xs}>
                      <Row gap={space.sm} align="center">
                        <Pressable
                          onPress={() => setCorrectId(choice.id)}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: isCorrect }}
                          accessibilityLabel={`Mark option ${index + 1} correct`}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 13,
                            borderWidth: 1.5,
                            borderColor: isCorrect ? theme.positive : theme.borderStrong,
                            backgroundColor: isCorrect ? theme.positiveSoft : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          {isCorrect ? <IconCheck color={theme.positive} size={14} /> : null}
                        </Pressable>
                        <TextInput
                          value={choice.text}
                          onChangeText={(value) =>
                            setChoices((prev) =>
                              prev.map((c) => (c.id === choice.id ? { ...c, text: value } : c))
                            )
                          }
                          placeholder={`Option ${index + 1}`}
                          placeholderTextColor={theme.textFaint}
                          maxLength={220}
                          style={{ ...field, flex: 1 }}
                        />
                      </Row>
                      {!isCorrect && choice.text.trim().length > 0 ? (
                        <TextInput
                          value={choice.whyWrong}
                          onChangeText={(value) =>
                            setChoices((prev) =>
                              prev.map((c) => (c.id === choice.id ? { ...c, whyWrong: value } : c))
                            )
                          }
                          placeholder="Why is this wrong? The misconception, not just 'incorrect'."
                          placeholderTextColor={theme.textFaint}
                          maxLength={300}
                          style={{ ...field, marginLeft: 34, fontSize: 14 }}
                        />
                      ) : null}
                    </Stack>
                  );
                })}
              </Stack>

              <Stack gap={space.xs}>
                <Text variant="smallStrong">Explanation</Text>
                <TextInput
                  value={explanation}
                  onChangeText={setExplanation}
                  placeholder="What this teaches and why it matters in the field."
                  placeholderTextColor={theme.textFaint}
                  multiline
                  maxLength={900}
                  style={{ ...field, minHeight: 84, textAlignVertical: 'top' }}
                />
              </Stack>

              <Stack gap={space.xs}>
                <Text variant="smallStrong">Source</Text>
                <TextInput
                  value={sourceUrl}
                  onChangeText={setSourceUrl}
                  placeholder="https://docs..."
                  placeholderTextColor={theme.textFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  maxLength={600}
                  style={field}
                />
                <Text variant="caption" tone="textFaint">
                  An https link to public documentation. Ungrounded questions are not accepted.
                </Text>
              </Stack>

              <Stack gap={space.xs}>
                <Text variant="smallStrong">Difficulty</Text>
                <Row gap={space.xs}>
                  {(['intro', 'core', 'deep', 'edge'] as const).map((key) => {
                    const active = difficulty === key;
                    return (
                      <Tappable
                        key={key}
                        onPress={() => setDifficulty(key)}
                        accessibilityLabel={DIFFICULTY_META[key].label}
                        style={{
                          flex: 1,
                          paddingVertical: space.sm,
                          borderRadius: radius.md,
                          borderWidth: 1.5,
                          borderColor: active ? theme.accent : theme.border,
                          backgroundColor: active ? theme.accentSoft : 'transparent',
                          alignItems: 'center',
                        }}>
                        <Text variant="caption" tone={active ? 'accent' : 'textMuted'}>
                          {DIFFICULTY_META[key].label}
                        </Text>
                      </Tappable>
                    );
                  })}
                </Row>
              </Stack>

              <Stack gap={space.xs}>
                <Text variant="smallStrong">Topics</Text>
                {nodeIds.length > 0 ? (
                  <Row gap={space.xs} wrap>
                    {nodeIds.map((id) => (
                      <Pressable
                        key={id}
                        onPress={() => setNodeIds((prev) => prev.filter((n) => n !== id))}
                        accessibilityLabel={`Remove ${id}`}>
                        <Chip label={id} color={theme.accent} filled />
                      </Pressable>
                    ))}
                  </Row>
                ) : null}
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search topics"
                  placeholderTextColor={theme.textFaint}
                  autoCapitalize="none"
                  style={field}
                />
                {matches.map((node) => (
                  <Pressable
                    key={node.id}
                    onPress={() => {
                      setNodeIds((prev) => (prev.includes(node.id) ? prev : [...prev, node.id]));
                      setSearch('');
                    }}>
                    <Row justify="space-between" align="center" style={{ paddingVertical: 6 }}>
                      <Text variant="small" style={{ flex: 1 }}>
                        {node.label}
                      </Text>
                      <Text variant="caption" tone="textFaint">
                        {node.id}
                      </Text>
                    </Row>
                  </Pressable>
                ))}
              </Stack>
            </Stack>
          </Card>

          {problems.length > 0 && stem.length > 0 ? (
            <Animated.View entering={FadeIn.duration(150)}>
              <Card accent={theme.warning}>
                <Stack gap={space.xs}>
                  <Eyebrow tone="warning">Before this can be sent</Eyebrow>
                  {problems.slice(0, 4).map((problem) => (
                    <Text key={problem.field + problem.message} variant="caption" tone="textMuted">
                      {problem.message}
                    </Text>
                  ))}
                </Stack>
              </Card>
            </Animated.View>
          ) : null}

          <Button
            title={saving ? 'Sending' : atLimit ? 'Daily limit reached' : 'Send for review'}
            size="lg"
            full
            disabled={problems.length > 0 || saving || atLimit}
            onPress={submit}
          />
          {note ? (
            <Text variant="caption" tone="textMuted" center>
              {note}
            </Text>
          ) : null}
          <Text variant="caption" tone="textFaint" center>
            {todayCount} of {DAILY_SUBMISSION_LIMIT} submitted today
          </Text>

          {mine.length > 0 ? (
            <>
              <Divider />
              <Stack gap={space.sm}>
                <Eyebrow>Your submissions</Eyebrow>
                {mine.slice(0, 8).map((row) => (
                  <Row key={row.id} justify="space-between" align="center">
                    <Text variant="caption" tone="textMuted" numberOfLines={1} style={{ flex: 1 }}>
                      {row.stem}
                    </Text>
                    <Chip
                      label={row.syncedAt ? 'in review' : 'on device'}
                      color={row.syncedAt ? theme.accent : theme.textFaint}
                    />
                  </Row>
                ))}
              </Stack>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
