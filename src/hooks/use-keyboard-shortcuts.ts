import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Keyboard shortcuts, web only.
 *
 * A quiz that needs a mouse is slow, and the whole product promise is a
 * three-minute session. Number keys pick an answer, Enter commits, arrows
 * review. Nothing here fires while the user is typing into a field, and
 * nothing here is the only way to do anything: every shortcut has a visible
 * control behind it, so this stays an accelerator rather than a requirement.
 */
export type ShortcutMap = Record<string, (() => void) | undefined>;

export function useKeyboardShortcuts(map: ShortcutMap, enabled = true) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;

    const onKey = (event: KeyboardEvent) => {
      // Never steal a keystroke meant for an input, and never fight a browser
      // shortcut the user asked for.
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const handler = map[event.key];
      if (handler) {
        event.preventDefault();
        handler();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [map, enabled]);
}
