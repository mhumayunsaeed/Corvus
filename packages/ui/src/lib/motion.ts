import type { Transition, Variants } from "framer-motion";

/**
 * Motion tokens for the Corvus redesign. Mirrors the durations/easings declared
 * in the Tailwind theme so JS-driven (Framer Motion) and CSS-driven animations
 * stay consistent. Keep motion fast and purposeful (see REDESIGN_PLAN §3.6).
 */

export const DURATION = {
  fast: 0.12,
  base: 0.18,
  slow: 0.24,
  page: 0.32,
} as const;

export const EASING = {
  standard: [0.2, 0, 0, 1],
  emphasized: [0.16, 1, 0.3, 1],
} as const;

export const SPRING: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 30,
};

/** Fade + rise — list items, cards, popovers. */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASING.standard },
  },
  exit: { opacity: 0, y: 4, transition: { duration: DURATION.fast } },
};

/** Scale + fade — modals, command palette, menus. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.base, ease: EASING.emphasized },
  },
  exit: { opacity: 0, scale: 0.98, transition: { duration: DURATION.fast } },
};

/** Simple opacity crossfade — overlays/backdrops. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.base } },
  exit: { opacity: 0, transition: { duration: DURATION.fast } },
};

/** Right-side sheet / context panel. */
export const sheetRight: Variants = {
  hidden: { x: "100%" },
  visible: { x: 0, transition: SPRING },
  exit: { x: "100%", transition: { duration: DURATION.slow, ease: EASING.standard } },
};
