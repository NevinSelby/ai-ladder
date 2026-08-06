import { useColorScheme } from '@/hooks/use-color-scheme';
import { PALETTES, type Palette, type SchemeName } from './tokens';

export * from './tokens';

/**
 * Light is the product, not a preference.
 *
 * The app is built for long study sessions on paper-toned ground, and that is
 * the design that was tuned and tested. Following the system into dark mode
 * would silently hand the user an untested second design at 9pm. Dark stays
 * available for deliberate night reading via `useScheme('auto')`, but the
 * default ignores the system setting.
 */
export function useScheme(follow: 'light' | 'auto' = 'light'): SchemeName {
  const system = useColorScheme();
  if (follow === 'light') return 'light';
  return system === 'dark' ? 'dark' : 'light';
}

export function useTheme(): Palette & { name: SchemeName } {
  const name = useScheme();
  return { ...PALETTES[name], name };
}
