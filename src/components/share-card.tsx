import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Platform, Share, View } from 'react-native';

import { IconCheck, IconLink } from '@/components/icons';
import { Button, Card, Eyebrow, Row, Stack, Text } from '@/components/ui';
import { radius, space, useTheme } from '@/theme';

/**
 * A shareable result.
 *
 * Deliberately text, not an image. A Wordle-style block of text pastes into
 * any chat, needs no rendering pipeline, and cannot leak anything the user did
 * not see: there is no screenshot of their account, no name, no email, no
 * link back to a profile. The result is the boast, and nothing else travels
 * with it.
 *
 * The question itself is never included. Spoiling a shared daily puzzle would
 * defeat the only reason it is shared.
 */
export function ShareCard({
  title,
  line,
  detail,
}: {
  title: string;
  line: string;
  /** Context shown in the app but never included in the shared text. */
  detail?: string;
}) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  const text = `${title}\n${line}\nAI Ladder`;

  const share = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web Share exists on mobile browsers and some desktops; clipboard is
        // the honest fallback rather than a broken button.
        const nav = navigator as Navigator & { share?: (data: { text: string }) => Promise<void> };
        if (nav.share) {
          await nav.share({ text });
          return;
        }
        await Clipboard.setStringAsync(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
        return;
      }
      await Share.share({ message: text });
    } catch {
      // A cancelled share is not an error worth showing anyone.
    }
  };

  return (
    <Card>
      <Stack gap={space.md}>
        <Eyebrow>Share your result</Eyebrow>

        <View
          style={{
            backgroundColor: theme.elevated,
            borderRadius: radius.md,
            padding: space.md,
            gap: 2,
          }}>
          <Text variant="smallStrong">{title}</Text>
          <Text variant="small" tone="textMuted">
            {line}
          </Text>
          <Text variant="caption" tone="textFaint">
            AI Ladder
          </Text>
        </View>

        {detail ? (
          <Text variant="caption" tone="textFaint">
            The puzzle itself is not included, so you will not spoil it.
          </Text>
        ) : null}

        <Button
          title={copied ? 'Copied' : 'Share'}
          kind="secondary"
          full
          onPress={share}
          right={
            copied ? (
              <IconCheck color={theme.positive} size={16} />
            ) : (
              <IconLink color={theme.text} size={16} />
            )
          }
        />
      </Stack>
    </Card>
  );
}

/** A compact result summary for a finished session, used on summary screens. */
export function sessionShareLine(correct: number, total: number, streak: number): string {
  const blocks = Array.from({ length: total }, (_, i) => (i < correct ? '▰' : '▱')).join('');
  return `${blocks}  ${correct}/${total} · ${streak} day streak`;
}
