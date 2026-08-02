/**
 * useZIndexManager Hook
 * Manages z-index values for proper overlay stacking
 */

import { useState, useCallback, useRef } from 'react';

interface ZIndexConfig {
  base: number;
  avatar: number;
  reaction: number;
  tooltip: number;
}

interface ZIndexState {
  [key: string]: number;
}

export const useZIndexManager = (config: ZIndexConfig) => {
  const [reservedZIndexes, setReservedZIndexes] = useState<ZIndexState>({});
  const nextZIndexRef = useRef(config.base);

  // Get base z-index for component type
  const getBaseZIndex = useCallback(
    (type: 'base' | 'avatar' | 'reaction' | 'tooltip') => {
      return config[type];
    },
    [config]
  );

  // Get z-index for specific component instance
  const getZIndex = useCallback(
    (type: 'avatar' | 'reaction' | 'tooltip', id: string) => {
      const key = `${type}-${id}`;

      if (reservedZIndexes[key]) {
        return reservedZIndexes[key];
      }

      // Return base z-index for the type
      return config[type];
    },
    [config, reservedZIndexes]
  );

  // Reserve a unique z-index for a component
  const reserveZIndex = useCallback((componentKey: string) => {
    const zIndex = nextZIndexRef.current++;

    setReservedZIndexes((prev) => ({
      ...prev,
      [componentKey]: zIndex,
    }));

    return zIndex;
  }, []);

  // Release a reserved z-index
  const releaseZIndex = useCallback((componentKey: string) => {
    setReservedZIndexes((prev) => {
      const { [componentKey]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  // Get the highest z-index currently in use
  const getHighestZIndex = useCallback(() => {
    const reservedValues = Object.values(reservedZIndexes);
    const maxReserved = reservedValues.length > 0 ? Math.max(...reservedValues) : 0;
    return Math.max(maxReserved, nextZIndexRef.current - 1);
  }, [reservedZIndexes]);

  // Ensure a component appears on top of all others
  const bringToFront = useCallback(
    (componentKey: string) => {
      const highestZIndex = getHighestZIndex();
      const newZIndex = highestZIndex + 1;

      setReservedZIndexes((prev) => ({
        ...prev,
        [componentKey]: newZIndex,
      }));

      nextZIndexRef.current = Math.max(nextZIndexRef.current, newZIndex + 1);

      return newZIndex;
    },
    [getHighestZIndex]
  );

  // Send a component to the back
  const sendToBack = useCallback(
    (componentKey: string, type: 'avatar' | 'reaction' | 'tooltip') => {
      const baseZIndex = config[type];

      setReservedZIndexes((prev) => ({
        ...prev,
        [componentKey]: baseZIndex - 1,
      }));

      return baseZIndex - 1;
    },
    [config]
  );

  // Reset all z-indexes
  const resetZIndexes = useCallback(() => {
    setReservedZIndexes({});
    nextZIndexRef.current = config.base;
  }, [config.base]);

  // Get z-index for stacking context
  const getStackingContext = useCallback(
    (type: 'avatar' | 'reaction' | 'tooltip', priority: 'low' | 'normal' | 'high' = 'normal') => {
      const baseZIndex = config[type];

      switch (priority) {
        case 'low':
          return baseZIndex - 10;
        case 'high':
          return baseZIndex + 10;
        case 'normal':
        default:
          return baseZIndex;
      }
    },
    [config]
  );

  // Check if a component has a reserved z-index
  const hasReservedZIndex = useCallback(
    (componentKey: string) => {
      return componentKey in reservedZIndexes;
    },
    [reservedZIndexes]
  );

  // Get all reserved z-indexes (for debugging)
  const getReservedZIndexes = useCallback(() => {
    return { ...reservedZIndexes };
  }, [reservedZIndexes]);

  // Calculate relative z-index for layered components
  const getRelativeZIndex = useCallback(
    (baseType: 'avatar' | 'reaction' | 'tooltip', offset: number = 0) => {
      return config[baseType] + offset;
    },
    [config]
  );

  return {
    getBaseZIndex,
    getZIndex,
    reserveZIndex,
    releaseZIndex,
    getHighestZIndex,
    bringToFront,
    sendToBack,
    resetZIndexes,
    getStackingContext,
    hasReservedZIndex,
    getReservedZIndexes,
    getRelativeZIndex,
  };
};
