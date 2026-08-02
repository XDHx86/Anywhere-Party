/**
 * Material Design 3 Theme System Types
 * Defines interfaces for comprehensive theming support
 */

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ColorVariant {
  main: string;
  light: string;
  dark: string;
  contrastText: string;
}

export interface MaterialPalette {
  primary: ColorVariant;
  secondary: ColorVariant;
  surface: ColorVariant;
  error: ColorVariant;
  background: string;
  onSurface: string;
  onPrimary: string;
  onSecondary: string;
  onError: string;
  outline: string;
  outlineVariant: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  text: {
    primary: string;
    secondary: string;
    disabled: string;
  };
  action: {
    hover: string;
    disabled: string;
  };
  divider: string;
  grey: {
    [key: number]: string;
  };
}

export interface MaterialSpacing {
  xs: string; // 4px
  sm: string; // 8px
  md: string; // 16px
  lg: string; // 24px
  xl: string; // 32px
  xxl: string; // 48px
}

export interface MaterialShape {
  borderRadius: {
    xs: string; // 4px
    sm: string; // 8px
    md: string; // 12px
    lg: string; // 16px
    xl: string; // 20px
    xxl: string; // 24px
  };
}

export interface MaterialElevation {
  none: string;
  low: string; // elevation-1
  medium: string; // elevation-3
  high: string; // elevation-5
}

export interface MaterialTypography {
  fontFamily: string;
  fontSize: {
    displayLarge: string;
    displayMedium: string;
    displaySmall: string;
    headlineLarge: string;
    headlineMedium: string;
    headlineSmall: string;
    titleLarge: string;
    titleMedium: string;
    titleSmall: string;
    labelLarge: string;
    labelMedium: string;
    labelSmall: string;
    bodyLarge: string;
    bodyMedium: string;
    bodySmall: string;
  };
  fontWeight: {
    light: number;
    regular: number;
    medium: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

export interface MaterialBreakpoints {
  xs: string; // 480px
  sm: string; // 600px
  md: string; // 840px
  lg: string; // 1200px
  xl: string; // 1600px
}

export interface MaterialThemeConfig {
  mode: ThemeMode;
  palette: MaterialPalette;
  spacing: MaterialSpacing;
  shape: MaterialShape;
  elevation: MaterialElevation;
  typography: MaterialTypography;
  breakpoints: MaterialBreakpoints;
  shadows: string[];
}

export interface ThemeContextValue {
  theme: MaterialThemeConfig;
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  themeSettings?: ThemeSettings;
  updateThemeSettings?: (updates: Partial<ThemeSettings>) => Promise<void>;
  isTransitioning?: boolean;
}

export interface ThemeSettings {
  mode: ThemeMode;
  customPrimaryColor?: string;
  customSecondaryColor?: string;
  enableCustomColors?: boolean;
  compactMode?: boolean;
  animationsEnabled?: boolean;
}

export type ElevationLevel = 'none' | 'low' | 'medium' | 'high';
export type CardVariant = 'elevated' | 'filled' | 'outlined';
export type SpacingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type BorderRadiusSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
