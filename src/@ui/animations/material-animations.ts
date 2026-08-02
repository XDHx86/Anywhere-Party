/**
 * Material Design 3 Animations and Transitions
 * Provides animation utilities following Material motion principles
 */

import { keyframes } from '@mui/material/styles';

// Material Design 3 Motion Tokens
export const materialMotion = {
  // Duration tokens
  duration: {
    short1: 50, // 50ms
    short2: 100, // 100ms
    short3: 150, // 150ms
    short4: 200, // 200ms
    medium1: 250, // 250ms
    medium2: 300, // 300ms
    medium3: 350, // 350ms
    medium4: 400, // 400ms
    long1: 450, // 450ms
    long2: 500, // 500ms
    long3: 550, // 550ms
    long4: 600, // 600ms
    extraLong1: 700, // 700ms
    extraLong2: 800, // 800ms
    extraLong3: 900, // 900ms
    extraLong4: 1000, // 1000ms
  },

  // Easing tokens
  easing: {
    // Standard easing for most transitions
    standard: 'cubic-bezier(0.2, 0.0, 0, 1.0)',

    // Decelerate easing for elements entering the screen
    decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1.0)',

    // Accelerate easing for elements exiting the screen
    accelerate: 'cubic-bezier(0.4, 0.0, 1.0, 1.0)',

    // Emphasized easing for important transitions
    emphasized: 'cubic-bezier(0.2, 0.0, 0, 1.0)',

    // Legacy easing for compatibility
    legacy: 'cubic-bezier(0.4, 0.0, 0.2, 1.0)',
  },
};

// Ripple effect keyframes
export const rippleAnimation = keyframes`
  0% {
    transform: scale(0);
    opacity: 0.6;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
`;

// Card expansion animation
export const cardExpansion = keyframes`
  0% {
    transform: scale(1);
    box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15);
  }
  100% {
    transform: scale(1.02);
    box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.3), 0px 8px 12px 6px rgba(0, 0, 0, 0.15);
  }
`;

// Fade in animation
export const fadeIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Fade out animation
export const fadeOut = keyframes`
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-8px);
  }
`;

// Slide in from bottom
export const slideInFromBottom = keyframes`
  0% {
    opacity: 0;
    transform: translateY(100%);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Slide out to bottom
export const slideOutToBottom = keyframes`
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(100%);
  }
`;

// Scale in animation
export const scaleIn = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
`;

// Scale out animation
export const scaleOut = keyframes`
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.8);
  }
`;

// Pulse animation for loading states
export const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

// Bounce animation for success states
export const bounce = keyframes`
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

// Shake animation for error states
export const shake = keyframes`
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-4px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(4px);
  }
`;

// Rotation animation for loading spinners
export const rotate = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

// Material Design 3 Animation Presets
export const materialAnimations = {
  // Button animations
  button: {
    ripple: {
      animation: `${rippleAnimation} ${materialMotion.duration.medium2}ms ${materialMotion.easing.standard}`,
    },
    hover: {
      transition: `all ${materialMotion.duration.short4}ms ${materialMotion.easing.standard}`,
    },
    press: {
      transition: `all ${materialMotion.duration.short1}ms ${materialMotion.easing.accelerate}`,
    },
  },

  // Card animations
  card: {
    hover: {
      transition: `all ${materialMotion.duration.medium1}ms ${materialMotion.easing.standard}`,
      animation: `${cardExpansion} ${materialMotion.duration.medium1}ms ${materialMotion.easing.standard} forwards`,
    },
    expand: {
      transition: `all ${materialMotion.duration.medium3}ms ${materialMotion.easing.emphasized}`,
    },
    collapse: {
      transition: `all ${materialMotion.duration.medium2}ms ${materialMotion.easing.standard}`,
    },
  },

  // Modal/Dialog animations
  modal: {
    enter: {
      animation: `${fadeIn} ${materialMotion.duration.medium4}ms ${materialMotion.easing.decelerate}`,
    },
    exit: {
      animation: `${fadeOut} ${materialMotion.duration.medium2}ms ${materialMotion.easing.accelerate}`,
    },
  },

  // Popup animations
  popup: {
    enter: {
      animation: `${scaleIn} ${materialMotion.duration.medium3}ms ${materialMotion.easing.emphasized}`,
    },
    exit: {
      animation: `${scaleOut} ${materialMotion.duration.medium2}ms ${materialMotion.easing.accelerate}`,
    },
  },

  // Loading animations
  loading: {
    pulse: {
      animation: `${pulse} ${materialMotion.duration.long2}ms ${materialMotion.easing.standard} infinite`,
    },
    rotate: {
      animation: `${rotate} ${materialMotion.duration.extraLong1}ms linear infinite`,
    },
  },

  // Feedback animations
  feedback: {
    success: {
      animation: `${bounce} ${materialMotion.duration.extraLong2}ms ${materialMotion.easing.emphasized}`,
    },
    error: {
      animation: `${shake} ${materialMotion.duration.long1}ms ${materialMotion.easing.standard}`,
    },
  },

  // List item animations
  listItem: {
    enter: {
      animation: `${slideInFromBottom} ${materialMotion.duration.medium3}ms ${materialMotion.easing.decelerate}`,
    },
    exit: {
      animation: `${slideOutToBottom} ${materialMotion.duration.medium2}ms ${materialMotion.easing.accelerate}`,
    },
  },
};

// Animation utility functions
export const createTransition = (
  properties: string | string[],
  duration: keyof typeof materialMotion.duration = 'medium2',
  easing: keyof typeof materialMotion.easing = 'standard'
) => {
  const props = Array.isArray(properties) ? properties.join(', ') : properties;
  return `${props} ${materialMotion.duration[duration]}ms ${materialMotion.easing[easing]}`;
};

export const createAnimation = (
  keyframe: any,
  duration: keyof typeof materialMotion.duration = 'medium2',
  easing: keyof typeof materialMotion.easing = 'standard',
  fillMode: 'none' | 'forwards' | 'backwards' | 'both' = 'none',
  iterationCount: number | 'infinite' = 1
) => {
  return `${keyframe} ${materialMotion.duration[duration]}ms ${materialMotion.easing[easing]} ${fillMode} ${iterationCount}`;
};

// Stagger animation utility for lists
export const createStaggeredAnimation = (
  keyframe: any,
  itemCount: number,
  staggerDelay: number = 50,
  baseDuration: keyof typeof materialMotion.duration = 'medium2'
) => {
  const animations: string[] = [];

  for (let i = 0; i < itemCount; i++) {
    const delay = i * staggerDelay;
    animations.push(
      `${keyframe} ${materialMotion.duration[baseDuration]}ms ${materialMotion.easing.decelerate} ${delay}ms forwards`
    );
  }

  return animations;
};

export default materialAnimations;
