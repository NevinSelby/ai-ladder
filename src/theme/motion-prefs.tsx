import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';

import { motion as BASE } from './tokens';

/**
 * Reduced-motion support.
 *
 * The app leans hard on animation, staggered entrances, spring presses, a
 * climbing figure, a celebrating flame. All of that is unpleasant or actively
 * disorienting for someone with vestibular sensitivity, and honoring the system
 * switch is an accessibility requirement rather than a nicety.
 *
 * Durations collapse to near-zero rather than to exactly zero: Reanimated
 * treats a 0ms timing as an instant set, which can skip layout callbacks that
 * entrance animations rely on. 1ms is imperceptible and keeps the machinery
 * intact.
 */

interface MotionPrefs {
  reduced: boolean;
  /** Duration tokens, already adjusted for the preference. */
  fast: number;
  base: number;
  slow: number;
  spring: { damping: number; stiffness: number; mass: number };
  /** Multiply a per-item stagger by this; 0 when motion is reduced. */
  stagger: number;
  /** Scale factor for press feedback; 1 (no squish) when reduced. */
  pressScale: number;
}

const FULL: MotionPrefs = {
  reduced: false,
  fast: BASE.fast,
  base: BASE.base,
  slow: BASE.slow,
  spring: BASE.spring,
  stagger: 1,
  pressScale: 0.97,
};

const REDUCED: MotionPrefs = {
  reduced: true,
  fast: 1,
  base: 1,
  slow: 1,
  // A stiff, heavily damped spring settles immediately with no visible travel.
  spring: { damping: 100, stiffness: 1000, mass: 0.5 },
  stagger: 0,
  pressScale: 1,
};

const MotionContext = createContext<MotionPrefs>(FULL);

export function MotionProvider({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;

    // Guarded deliberately. Calling `AccessibilityInfo.isReduceMotionEnabled?.()`
    // and chaining `.then` on the result crashes at module scope when the method
    // is absent, because the optional call yields undefined. A bug that cost a
    // silent white screen on an earlier project. Check the type, then wrap.
    const query = AccessibilityInfo.isReduceMotionEnabled;
    if (typeof query === 'function') {
      Promise.resolve(query.call(AccessibilityInfo))
        .then((value) => {
          if (alive) setReduced(Boolean(value));
        })
        .catch(() => {});
    }

    const subscription = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      (value) => setReduced(Boolean(value))
    );

    return () => {
      alive = false;
      subscription?.remove?.();
    };
  }, []);

  const value = useMemo(() => (reduced ? REDUCED : FULL), [reduced]);
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

/** Motion tokens that already respect the user's system preference. */
export function useMotion(): MotionPrefs {
  return useContext(MotionContext);
}
