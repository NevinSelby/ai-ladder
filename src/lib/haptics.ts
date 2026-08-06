import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptics behind a user preference.
 *
 * The setting lives in the profile row; this module holds it as a flag so a
 * drill answer does not need a database read before it can buzz. Boot loads the
 * stored value once, and the profile screen updates both places when toggled.
 *
 * Every call is fire-and-forget with a swallowed rejection: haptics failing
 * (web, simulator, silenced hardware) must never surface as an app error.
 */

let enabled = true;

export function setHapticsFlag(value: boolean) {
  enabled = value;
}

export function hapticsFlag(): boolean {
  return enabled;
}

const canBuzz = () => enabled && Platform.OS !== 'web';

/** Light tick for selections and reveals. */
export function tapHaptic() {
  if (canBuzz()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** A correct answer, a completed lesson, a banked session. */
export function successHaptic() {
  if (canBuzz()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** A miss. Softer than an error: a wrong answer is practice, not a fault. */
export function warningHaptic() {
  if (canBuzz()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
