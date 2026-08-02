/**
 * Material Design 3 Animation Hooks
 * Custom hooks for managing component animations and states
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { materialMotion } from '../animations/material-animations';

// Animation state types
export type AnimationState = 'idle' | 'entering' | 'entered' | 'exiting' | 'exited';

// Ripple effect hook
export const useRipple = () => {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const nextRippleId = useRef(0);

  const createRipple = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newRipple = {
      id: nextRippleId.current++,
      x,
      y,
    };

    setRipples((prev) => [...prev, newRipple]);

    // Remove ripple after animation completes
    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== newRipple.id));
    }, materialMotion.duration.medium4);
  }, []);

  return { ripples, createRipple };
};

// Hover animation hook
export const useHoverAnimation = (
  hoverScale: number = 1.02,
  duration: keyof typeof materialMotion.duration = 'medium1'
) => {
  const [isHovered, setIsHovered] = useState(false);

  const hoverProps = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
    style: {
      transform: isHovered ? `scale(${hoverScale})` : 'scale(1)',
      transition: `transform ${materialMotion.duration[duration]}ms ${materialMotion.easing.standard}`,
    },
  };

  return { isHovered, hoverProps };
};

// Focus animation hook
export const useFocusAnimation = () => {
  const [isFocused, setIsFocused] = useState(false);

  const focusProps = {
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  };

  return { isFocused, focusProps };
};

// Loading animation hook
export const useLoadingAnimation = (isLoading: boolean) => {
  const [animationState, setAnimationState] = useState<AnimationState>('idle');

  useEffect(() => {
    if (isLoading) {
      setAnimationState('entering');
      const timer = setTimeout(() => {
        setAnimationState('entered');
      }, materialMotion.duration.short2);
      return () => clearTimeout(timer);
    } else {
      setAnimationState('exiting');
      const timer = setTimeout(() => {
        setAnimationState('exited');
      }, materialMotion.duration.short2);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  return animationState;
};

// Stagger animation hook for lists
export const useStaggerAnimation = (
  itemCount: number,
  staggerDelay: number = 50,
  trigger: boolean = true
) => {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);

  useEffect(() => {
    if (trigger) {
      setVisibleItems([]);

      for (let i = 0; i < itemCount; i++) {
        setTimeout(() => {
          setVisibleItems((prev) => [...prev, i]);
        }, i * staggerDelay);
      }
    }
  }, [itemCount, staggerDelay, trigger]);

  return visibleItems;
};

// Card expansion animation hook
export const useCardExpansion = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animationState, setAnimationState] = useState<AnimationState>('idle');

  const expand = useCallback(() => {
    setAnimationState('entering');
    setIsExpanded(true);

    setTimeout(() => {
      setAnimationState('entered');
    }, materialMotion.duration.medium3);
  }, []);

  const collapse = useCallback(() => {
    setAnimationState('exiting');

    setTimeout(() => {
      setIsExpanded(false);
      setAnimationState('exited');
    }, materialMotion.duration.medium2);
  }, []);

  const toggle = useCallback(() => {
    if (isExpanded) {
      collapse();
    } else {
      expand();
    }
  }, [isExpanded, expand, collapse]);

  return {
    isExpanded,
    animationState,
    expand,
    collapse,
    toggle,
  };
};

// Feedback animation hook (success, error, etc.)
export const useFeedbackAnimation = () => {
  const [feedbackState, setFeedbackState] = useState<'idle' | 'success' | 'error' | 'warning'>(
    'idle'
  );
  const [isAnimating, setIsAnimating] = useState(false);

  const triggerFeedback = useCallback((type: 'success' | 'error' | 'warning') => {
    setFeedbackState(type);
    setIsAnimating(true);

    setTimeout(() => {
      setIsAnimating(false);
      setFeedbackState('idle');
    }, materialMotion.duration.extraLong2);
  }, []);

  return {
    feedbackState,
    isAnimating,
    triggerSuccess: () => triggerFeedback('success'),
    triggerError: () => triggerFeedback('error'),
    triggerWarning: () => triggerFeedback('warning'),
  };
};

// Intersection observer animation hook
export const useIntersectionAnimation = (threshold: number = 0.1, rootMargin: string = '0px') => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setIsVisible(true);
          setHasAnimated(true);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, hasAnimated]);

  return { elementRef, isVisible, hasAnimated };
};

// Gesture animation hook for touch interactions
export const useGestureAnimation = () => {
  const [gestureState, setGestureState] = useState<'idle' | 'pressing' | 'dragging'>('idle');
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleTouchStart = useCallback(() => {
    setGestureState('pressing');
  }, []);

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (gestureState === 'pressing') {
        setGestureState('dragging');
      }

      const touch = event.touches[0];
      if (touch) {
        setPosition({ x: touch.clientX, y: touch.clientY });
      }
    },
    [gestureState]
  );

  const handleTouchEnd = useCallback(() => {
    setGestureState('idle');
    setPosition({ x: 0, y: 0 });
  }, []);

  return {
    gestureState,
    position,
    gestureProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
};

export default {
  useRipple,
  useHoverAnimation,
  useFocusAnimation,
  useLoadingAnimation,
  useStaggerAnimation,
  useCardExpansion,
  useFeedbackAnimation,
  useIntersectionAnimation,
  useGestureAnimation,
};
