/**
 * Overlay Animation Utilities
 * Material Design 3 animations specifically for overlay components
 */

import { keyframes } from '@emotion/react';
import { materialMotion } from '../../../animations/material-animations';

// Overlay-specific keyframes
export const overlayFadeIn = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
`;

export const overlayFadeOut = keyframes`
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.9);
  }
`;

export const overlaySlideIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const overlaySlideOut = keyframes`
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-20px);
  }
`;

export const overlayScaleIn = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
`;

export const overlayScaleOut = keyframes`
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.5);
  }
`;

// Avatar-specific animations
export const avatarPulse = keyframes`
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(98, 0, 238, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 8px rgba(98, 0, 238, 0);
  }
`;

export const avatarBounce = keyframes`
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(0, 0, 0);
  }
  40%, 43% {
    transform: translate3d(0, -8px, 0);
  }
  70% {
    transform: translate3d(0, -4px, 0);
  }
  90% {
    transform: translate3d(0, -2px, 0);
  }
`;

export const avatarShake = keyframes`
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-2px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(2px);
  }
`;

// Reaction-specific animations
export const reactionFloat = keyframes`
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(-30px) rotate(5deg);
    opacity: 0;
  }
`;

export const reactionPop = keyframes`
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

export const reactionSparkle = keyframes`
  0%, 100% {
    opacity: 0;
    transform: scale(0) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: scale(1) rotate(180deg);
  }
`;

// Tooltip animations
export const tooltipSlideIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const tooltipSlideOut = keyframes`
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(8px);
  }
`;

// Stagger animation utilities
export const createStaggeredOverlayAnimation = (
  keyframe: unknown,
  itemCount: number,
  staggerDelay: number = 100,
  baseDuration: keyof typeof materialMotion.duration = 'medium3'
) => {
  const animations: string[] = [];

  for (let i = 0; i < itemCount; i++) {
    const delay = i * staggerDelay;
    animations.push(
      `${keyframe} ${materialMotion.duration[baseDuration]}ms ${materialMotion.easing.emphasized} ${delay}ms both`
    );
  }

  return animations;
};

// Animation presets for overlays
export const overlayAnimations = {
  // Floating surface animations
  surface: {
    fadeIn: {
      animation: `${overlayFadeIn} ${materialMotion.duration.medium3}ms ${materialMotion.easing.emphasized}`,
    },
    fadeOut: {
      animation: `${overlayFadeOut} ${materialMotion.duration.medium2}ms ${materialMotion.easing.accelerate}`,
    },
    slideIn: {
      animation: `${overlaySlideIn} ${materialMotion.duration.medium3}ms ${materialMotion.easing.decelerate}`,
    },
    slideOut: {
      animation: `${overlaySlideOut} ${materialMotion.duration.medium2}ms ${materialMotion.easing.accelerate}`,
    },
    scaleIn: {
      animation: `${overlayScaleIn} ${materialMotion.duration.medium4}ms ${materialMotion.easing.emphasized}`,
    },
    scaleOut: {
      animation: `${overlayScaleOut} ${materialMotion.duration.medium2}ms ${materialMotion.easing.accelerate}`,
    },
  },

  // Avatar animations
  avatar: {
    pulse: {
      animation: `${avatarPulse} ${materialMotion.duration.long2}ms ${materialMotion.easing.standard} infinite`,
    },
    bounce: {
      animation: `${avatarBounce} ${materialMotion.duration.extraLong2}ms ${materialMotion.easing.emphasized}`,
    },
    shake: {
      animation: `${avatarShake} ${materialMotion.duration.long1}ms ${materialMotion.easing.standard}`,
    },
    enter: {
      animation: `${overlayScaleIn} ${materialMotion.duration.medium3}ms ${materialMotion.easing.emphasized}`,
    },
    exit: {
      animation: `${overlayScaleOut} ${materialMotion.duration.medium2}ms ${materialMotion.easing.accelerate}`,
    },
  },

  // Reaction animations
  reaction: {
    pop: {
      animation: `${reactionPop} ${materialMotion.duration.medium3}ms ${materialMotion.easing.emphasized}`,
    },
    float: {
      animation: `${reactionFloat} ${materialMotion.duration.extraLong4}ms ${materialMotion.easing.standard}`,
    },
    sparkle: {
      animation: `${reactionSparkle} ${materialMotion.duration.long2}ms ${materialMotion.easing.standard} infinite`,
    },
    enter: {
      animation: `${reactionPop} ${materialMotion.duration.medium3}ms ${materialMotion.easing.emphasized}`,
    },
    exit: {
      animation: `${reactionFloat} ${materialMotion.duration.long4}ms ${materialMotion.easing.accelerate}`,
    },
  },

  // Tooltip animations
  tooltip: {
    slideIn: {
      animation: `${tooltipSlideIn} ${materialMotion.duration.short4}ms ${materialMotion.easing.decelerate}`,
    },
    slideOut: {
      animation: `${tooltipSlideOut} ${materialMotion.duration.short3}ms ${materialMotion.easing.accelerate}`,
    },
  },
};

// Animation timing functions
export const overlayTimings = {
  // Quick interactions
  quick: {
    enter: materialMotion.duration.short4,
    exit: materialMotion.duration.short3,
  },

  // Standard interactions
  standard: {
    enter: materialMotion.duration.medium3,
    exit: materialMotion.duration.medium2,
  },

  // Emphasized interactions
  emphasized: {
    enter: materialMotion.duration.medium4,
    exit: materialMotion.duration.medium2,
  },

  // Long-running animations
  extended: {
    enter: materialMotion.duration.long2,
    exit: materialMotion.duration.medium4,
  },
};

// Easing presets for overlays
export const overlayEasing = {
  enter: materialMotion.easing.emphasized,
  exit: materialMotion.easing.accelerate,
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
};

export default overlayAnimations;
