import { usePreventRemove } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import type { NavigationAction } from '@react-navigation/native';

import { Button, Stack, Text } from '@/components/ui';
import { elevation, motion, radius, space, useTheme } from '@/theme';

/**
 * Confirm before leaving a session in progress.
 *
 * Guards *both* exit routes, which is the whole point: the CLOSE button is easy
 * to intercept, but a modal is also dismissed by swiping down, and that gesture
 * bypasses any handler wired to a button. `usePreventRemove` sits on the
 * navigation action itself, so the swipe, the header button and the Android
 * back button all funnel through the same confirmation.
 *
 * The dialog is themed rather than a system `Alert` for one concrete reason: it
 * lets the copy state exactly what is and is not lost. "Discard 2 remaining
 * questions?" is a decision someone can make; "Are you sure?" is not.
 */

export interface ConfirmExitOptions {
  /** Guard only while there is something to lose. */
  enabled: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /**
   * Runs before navigation proceeds. Use it to bank whatever the user already
   * earned, leaving early should cost the remaining questions, not the
   * answered ones.
   */
  onConfirm?: () => void | Promise<void>;
}

export function useConfirmExit(options: ConfirmExitOptions) {
  const { enabled, title, message, confirmLabel = 'Leave', cancelLabel = 'Keep going', onConfirm } =
    options;

  const navigation = useNavigation();
  const [pending, setPending] = useState<NavigationAction | null>(null);
  const [busy, setBusy] = useState(false);

  usePreventRemove(enabled, ({ data }) => setPending(data.action));

  const confirm = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm?.();
    } finally {
      setBusy(false);
    }
    const action = pending;
    setPending(null);
    // Dispatch the original action rather than calling back(): the user may have
    // triggered a swipe dismiss, a back press, or a tab jump, and each carries a
    // different target.
    if (action) navigation.dispatch(action);
    else navigation.goBack();
  }, [busy, onConfirm, pending, navigation]);

  /** For an in-screen CLOSE control, so it takes the same path as the gesture. */
  const requestExit = useCallback(() => {
    if (!enabled) {
      navigation.goBack();
      return;
    }
    navigation.goBack();
  }, [enabled, navigation]);

  const dialog = (
    <ConfirmDialog
      visible={pending !== null}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      busy={busy}
      onConfirm={confirm}
      onCancel={() => setPending(null)}
    />
  );

  return { dialog, requestExit };
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  busy,
  onConfirm,
  onCancel,
  children,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View
        entering={FadeIn.duration(motion.fast)}
        style={{
          flex: 1,
          backgroundColor: theme.scrim,
          alignItems: 'center',
          justifyContent: 'center',
          padding: space.xl,
        }}>
        {/* Tapping the scrim cancels: the safe outcome, which is what a
            mis-tap outside a destructive dialog should always be. */}
        <Pressable
          style={{ position: 'absolute', inset: 0 }}
          onPress={onCancel}
          accessibilityLabel={cancelLabel}
        />
        <Animated.View
          entering={FadeInDown.duration(motion.base).springify().damping(18)}
          style={[
            {
              width: '100%',
              maxWidth: 360,
              backgroundColor: theme.surface,
              borderRadius: radius.lg,
              padding: space.xl,
              gap: space.lg,
            },
            elevation(theme, 2),
          ]}>
          <Stack gap={space.sm}>
            <Text variant="heading">{title}</Text>
            <Text variant="small" tone="textMuted">
              {message}
            </Text>
          </Stack>

          {children}

          <View style={{ gap: space.sm }}>
            <Button title={cancelLabel} kind="primary" size="lg" full onPress={onCancel} />
            <Button
              title={busy ? 'Saving…' : confirmLabel}
              kind="ghost"
              full
              disabled={busy}
              onPress={onConfirm}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
