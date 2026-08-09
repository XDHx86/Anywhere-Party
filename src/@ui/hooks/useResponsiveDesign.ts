/**
 * Responsive Design Hook
 * Provides responsive breakpoints and utilities for different screen sizes
 * Requirements: 25.4, 26.5
 */

import { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';

export type BreakpointKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ResponsiveState {
  breakpoint: BreakpointKey;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeScreen: boolean;
  width: number;
  height: number;
  isPopup: boolean;
  isExtensionContext: boolean;
}

export interface ResponsiveConfig {
  popupMaxWidth: number;
  popupMaxHeight: number;
  mobileBreakpoint: number;
  tabletBreakpoint: number;
  desktopBreakpoint: number;
  largeScreenBreakpoint: number;
}

const defaultConfig: ResponsiveConfig = {
  popupMaxWidth: 400,
  popupMaxHeight: 600,
  mobileBreakpoint: 480,
  tabletBreakpoint: 840,
  desktopBreakpoint: 1200,
  largeScreenBreakpoint: 1600,
};

export const useResponsiveDesign = (config: Partial<ResponsiveConfig> = {}) => {
  const theme = useTheme();
  const finalConfig = { ...defaultConfig, ...config };

  // Media queries using Material-UI breakpoints
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isMd = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isLg = useMediaQuery(theme.breakpoints.between('lg', 'xl'));

  // Custom breakpoints for extension context
  const isMobile = useMediaQuery(`(max-width: ${finalConfig.mobileBreakpoint}px)`);
  const isTablet = useMediaQuery(
    `(min-width: ${finalConfig.mobileBreakpoint + 1}px) and (max-width: ${finalConfig.tabletBreakpoint}px)`
  );
  const isDesktop = useMediaQuery(
    `(min-width: ${finalConfig.tabletBreakpoint + 1}px) and (max-width: ${finalConfig.largeScreenBreakpoint}px)`
  );
  const isLargeScreen = useMediaQuery(`(min-width: ${finalConfig.largeScreenBreakpoint + 1}px)`);

  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const [isPopup, setIsPopup] = useState(false);
  const [isExtensionContext, setIsExtensionContext] = useState(false);

  // Update dimensions on resize
  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;

      setDimensions({ width: newWidth, height: newHeight });

      // Detect if we're in a popup context based on size constraints
      const isPopupSize =
        newWidth <= finalConfig.popupMaxWidth && newHeight <= finalConfig.popupMaxHeight;
      setIsPopup(isPopupSize);
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [finalConfig.popupMaxWidth, finalConfig.popupMaxHeight]);

  // Detect extension context
  useEffect(() => {
    const isExtension = !!(
      (typeof chrome !== 'undefined' && chrome.runtime) ||
      (typeof browser !== 'undefined' && browser.runtime)
    );
    setIsExtensionContext(isExtension);
  }, []);

  // Determine current breakpoint
  const getCurrentBreakpoint = (): BreakpointKey => {
    if (isXs) return 'xs';
    if (isSm) return 'sm';
    if (isMd) return 'md';
    if (isLg) return 'lg';
    return 'xl';
  };

  const responsiveState: ResponsiveState = {
    breakpoint: getCurrentBreakpoint(),
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen,
    width: dimensions.width,
    height: dimensions.height,
    isPopup,
    isExtensionContext,
  };

  return responsiveState;
};

// Hook for responsive spacing
export const useResponsiveSpacing = () => {
  const responsive = useResponsiveDesign();
  const theme = useTheme();

  const getSpacing = (base: number): number => {
    if (responsive.isMobile) {
      return base * 0.75; // Reduce spacing on mobile
    }
    if (responsive.isPopup) {
      return base * 0.85; // Slightly reduce spacing in popup
    }
    return base;
  };

  const getPadding = (size: 'sm' | 'md' | 'lg' | 'xl'): string => {
    const baseValues = {
      sm: 1,
      md: 2,
      lg: 3,
      xl: 4,
    };

    const scaledValue = getSpacing(baseValues[size]);
    return theme.spacing(scaledValue);
  };

  const getMargin = (size: 'sm' | 'md' | 'lg' | 'xl'): string => {
    return getPadding(size);
  };

  return {
    getSpacing,
    getPadding,
    getMargin,
    responsive,
  };
};

// Hook for responsive typography
export const useResponsiveTypography = () => {
  const responsive = useResponsiveDesign();

  const getFontSize = (baseSize: string): string => {
    if (responsive.isMobile) {
      // Reduce font sizes on mobile
      const sizeMap: Record<string, string> = {
        '2.5rem': '2rem',
        '2rem': '1.75rem',
        '1.75rem': '1.5rem',
        '1.5rem': '1.25rem',
        '1.25rem': '1.125rem',
        '1.125rem': '1rem',
        '1rem': '0.875rem',
        '0.875rem': '0.75rem',
      };
      return sizeMap[baseSize] || baseSize;
    }

    if (responsive.isPopup) {
      // Slightly reduce font sizes in popup
      const sizeMap: Record<string, string> = {
        '2.5rem': '2.25rem',
        '2rem': '1.875rem',
        '1.75rem': '1.625rem',
        '1.5rem': '1.375rem',
        '1.25rem': '1.125rem',
      };
      return sizeMap[baseSize] || baseSize;
    }

    return baseSize;
  };

  const getLineHeight = (baseLineHeight: number): number => {
    if (responsive.isMobile) {
      return Math.max(1.2, baseLineHeight - 0.1);
    }
    return baseLineHeight;
  };

  return {
    getFontSize,
    getLineHeight,
    responsive,
  };
};

// Hook for responsive grid layouts
export const useResponsiveGrid = () => {
  const responsive = useResponsiveDesign();

  const getGridColumns = (
    xs: number = 1,
    sm: number = 2,
    md: number = 3,
    lg: number = 4,
    xl: number = 5
  ): number => {
    if (responsive.breakpoint === 'xs') return xs;
    if (responsive.breakpoint === 'sm') return sm;
    if (responsive.breakpoint === 'md') return md;
    if (responsive.breakpoint === 'lg') return lg;
    return xl;
  };

  const getGridGap = (): string => {
    if (responsive.isMobile) return '8px';
    if (responsive.isTablet) return '12px';
    if (responsive.isPopup) return '12px';
    return '16px';
  };

  const getContainerMaxWidth = (): string => {
    if (responsive.isPopup) return '100%';
    if (responsive.isMobile) return '100%';
    if (responsive.isTablet) return '768px';
    if (responsive.isDesktop) return '1024px';
    return '1200px';
  };

  return {
    getGridColumns,
    getGridGap,
    getContainerMaxWidth,
    responsive,
  };
};

// Hook for touch-friendly interactions
export const useTouchOptimization = () => {
  const responsive = useResponsiveDesign();
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchSupport = () => {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    };

    setIsTouchDevice(checkTouchSupport());
  }, []);

  const getTouchTargetSize = (baseSize: number): number => {
    if (isTouchDevice || responsive.isMobile) {
      // Ensure minimum 44px touch target (iOS guidelines)
      return Math.max(44, baseSize);
    }
    return baseSize;
  };

  const getTouchSpacing = (baseSpacing: number): number => {
    if (isTouchDevice || responsive.isMobile) {
      // Increase spacing for touch interactions
      return baseSpacing * 1.25;
    }
    return baseSpacing;
  };

  const shouldShowTooltips = (): boolean => {
    // Hide tooltips on touch devices to avoid interference
    return !isTouchDevice;
  };

  return {
    isTouchDevice,
    getTouchTargetSize,
    getTouchSpacing,
    shouldShowTooltips,
    responsive,
  };
};

export default useResponsiveDesign;
