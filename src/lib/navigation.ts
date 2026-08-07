import { router } from 'expo-router';

/**
 * Go back, or go somewhere sensible.
 *
 * `router.back()` on its own is only correct when the screen was pushed onto an
 * existing stack. It does nothing at all when there is no history entry to pop,
 * which happens more often than it sounds:
 *
 *   - the URL was opened directly, or the page was reloaded on the web
 *   - the screen was reached by `replace` rather than `push`, as the auth gate
 *     does after a sign-in
 *   - the app was cold-started onto a deep link from a notification
 *
 * In all of those the button appeared to do nothing, which reads as broken
 * rather than as "there is nowhere to go". Falling back to an explicit
 * destination means the control always does something.
 */
export function goBack(fallback: string = '/') {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  // `replace`, not `push`: arriving at the fallback should not leave a history
  // entry that sends the user in a circle.
  router.replace(fallback as never);
}
