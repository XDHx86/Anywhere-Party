/**
 * useResponsiveOverlays Hook
 * Manages responsive overlay positioning for different screen sizes
 */

import { useState, useEffect, useMemo } from 'react';
import { OverlayBreakpoints } from '../types';

const defaultBreakpoints: OverlayBreakpoints = {
  mobile: {
    maxWidth: 600,
    avatarSize: 'small',
    reactionSize: 'small',
    maxAvatars: 4,
  },
  tablet: {
    maxWidth: 1024,
    avatarSize: 'medium',
    reactionSize: 'medium',
    maxAvatars: 8,
  },
  desktop: {
    maxWidth: Infinity,
    avatarSize: 'large',
    reactionSize: 'large',
    maxAvatars: 12,
  },
};

export const useResponsiveOverlays = (
  containerWidth: number,
  customBreakpoints?: Partial<OverlayBreakpoints>
) => {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>(
    'desktop'
  );

  // Merge custom breakpoints with defaults
  const breakpoints = useMemo(
    () => ({
      ...defaultBreakpoints,
      ...customBreakpoints,
    }),
    [customBreakpoints]
  );

  // Update breakpoint based on container width
  useEffect(() => {
    if (containerWidth <= breakpoints.mobile.maxWidth) {
      setCurrentBreakpoint('mobile');
    } else if (containerWidth <= breakpoints.tablet.maxWidth) {
      setCurrentBreakpoint('tablet');
    } else {
      setCurrentBreakpoint('desktop');
    }
  }, [containerWidth, breakpoints]);

  // Get responsive configuration
  const getResponsiveConfig = () => {
    const config = breakpoints[currentBreakpoint];

    return {
      maxAvatarsPerRow: Math.floor(config.maxAvatars / 2),
      avatarSpacing: currentBreakpoint === 'mobile' ? 12 : currentBreakpoint === 'tablet' ? 16 : 20,
      reactionSpacing:
        currentBreakpoint === 'mobile' ? 8 : currentBreakpoint === 'tablet' ? 12 : 16,
      edgeOffset: currentBreakpoint === 'mobile' ? 12 : currentBreakpoint === 'tablet' ? 16 : 20,
    };
  };

  // Get avatar size for current breakpoint
  const getAvatarSize = () => {
    return breakpoints[currentBreakpoint].avatarSize;
  };

  // Get reaction size for current breakpoint
  const getReactionSize = () => {
    return breakpoints[currentBreakpoint].reactionSize;
  };

  // Get max avatars for current breakpoint
  const getMaxAvatars = () => {
    return breakpoints[currentBreakpoint].maxAvatars;
  };

  // Check if current breakpoint is mobile
  const isMobile = currentBreakpoint === 'mobile';

  // Check if current breakpoint is tablet
  const isTablet = currentBreakpoint === 'tablet';

  // Check if current breakpoint is desktop
  const isDesktop = currentBreakpoint === 'desktop';

  // Get responsive avatar dimensions
  const getAvatarDimensions = () => {
    switch (currentBreakpoint) {
      case 'mobile':
        return { width: 32, height: 32 };
      case 'tablet':
        return { width: 48, height: 48 };
      case 'desktop':
        return { width: 64, height: 64 };
      default:
        return { width: 48, height: 48 };
    }
  };

  // Get responsive reaction dimensions
  const getReactionDimensions = () => {
    switch (currentBreakpoint) {
      case 'mobile':
        return { width: 24, height: 24 };
      case 'tablet':
        return { width: 32, height: 32 };
      case 'desktop':
        return { width: 40, height: 40 };
      default:
        return { width: 32, height: 32 };
    }
  };

  // Calculate optimal grid layout
  const calculateGridLayout = (
    itemCount: number,
    containerWidth: number,
    containerHeight: number
  ) => {
    const config = getResponsiveConfig();
    const avatarDimensions = getAvatarDimensions();

    const availableWidth = containerWidth - config.edgeOffset * 2;
    const availableHeight = containerHeight - config.edgeOffset * 2;

    const itemsPerRow = Math.floor(
      availableWidth / (avatarDimensions.width + config.avatarSpacing)
    );
    const maxRows = Math.floor(availableHeight / (avatarDimensions.height + config.avatarSpacing));
    const maxItems = itemsPerRow * maxRows;

    return {
      itemsPerRow: Math.max(1, itemsPerRow),
      maxRows: Math.max(1, maxRows),
      maxItems: Math.max(1, maxItems),
      actualItems: Math.min(itemCount, maxItems),
    };
  };

  // Get touch-friendly spacing
  const getTouchSpacing = () => {
    // Increase spacing on mobile for better touch targets
    return currentBreakpoint === 'mobile' ? 16 : 12;
  };

  return {
    breakpoint: currentBreakpoint,
    breakpoints,
    getResponsiveConfig,
    getAvatarSize,
    getReactionSize,
    getMaxAvatars,
    getAvatarDimensions,
    getReactionDimensions,
    calculateGridLayout,
    getTouchSpacing,
    isMobile,
    isTablet,
    isDesktop,
  };
};
