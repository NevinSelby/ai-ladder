import { Platform, useWindowDimensions } from 'react-native';

/**
 * Responsive layout.
 *
 * The phone layout stretched onto a 1440px monitor is the classic port smell:
 * a thin column of content marooned in whitespace with a tab bar glued to the
 * bottom of a screen nobody's thumbs can reach. Desktop wants navigation down
 * the side, a wider measure, and room for two columns.
 *
 * Breakpoints are width-based rather than platform-based, so a tablet and a
 * narrow browser window both get the layout that actually fits them. Only the
 * side navigation is gated on web as well, because a bottom bar is right for a
 * held device however wide it is.
 */

export const BREAKPOINT = {
  /** Below this, one column and a bottom tab bar. */
  compact: 720,
  /** At or above this, side navigation and a two-column grid become possible. */
  wide: 1024,
};

/** Reading measure. Prose stops being readable much past this. */
export const MAX_TEXT_WIDTH = 680;

export interface Layout {
  width: number;
  /** Phone-shaped: one column, bottom tabs. */
  compact: boolean;
  /** Desktop-shaped: side navigation, wider content, grids allowed. */
  desktop: boolean;
  /** How wide the content column may grow. */
  contentWidth: number;
  /** Columns a card grid should use. */
  columns: number;
}

export function useLayout(): Layout {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const desktop = isWeb && width >= BREAKPOINT.compact;

  return {
    width,
    compact: width < BREAKPOINT.compact,
    desktop,
    // Wide screens get a genuinely wider column, but never edge to edge: a
    // 1600px line of text is unreadable no matter how much monitor there is.
    contentWidth: desktop ? (width >= BREAKPOINT.wide ? 1080 : 820) : MAX_TEXT_WIDTH,
    columns: desktop && width >= BREAKPOINT.wide ? 2 : 1,
  };
}
