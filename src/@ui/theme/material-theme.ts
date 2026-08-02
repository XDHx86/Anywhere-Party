/**
 * Material Design 3 Theme Configuration
 * Implements the Material Design 3 color system and design tokens
 */

import { MaterialThemeConfig, MaterialPalette, ThemeMode } from './types';

// Material Design 3 Light Theme Palette
const lightPalette: MaterialPalette = {
  primary: {
    main: '#6200EE', // Primary color from requirements
    light: '#9c47ff',
    dark: '#0000ba',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#03DAC6', // Secondary color from requirements
    light: '#66fff9',
    dark: '#00a896',
    contrastText: '#000000',
  },
  surface: {
    main: '#FFFFFF', // Surface color from requirements
    light: '#ffffff',
    dark: '#f5f5f5',
    contrastText: '#1c1b1f',
  },
  error: {
    main: '#B00020', // Error color from requirements
    light: '#e7334e',
    dark: '#790000',
    contrastText: '#ffffff',
  },
  background: '#fffbfe',
  onSurface: '#1c1b1f',
  onPrimary: '#ffffff',
  onSecondary: '#000000',
  onError: '#ffffff',
  outline: '#79747e',
  outlineVariant: '#cac4d0',
  surfaceVariant: '#e7e0ec',
  onSurfaceVariant: '#49454f',
  text: {
    primary: '#1c1b1f',
    secondary: '#49454f',
    disabled: '#1c1b1f61', // 38% opacity
  },
  action: {
    hover: '#1c1b1f08', // 8% opacity
    disabled: '#1c1b1f38', // 38% opacity
  },
  divider: '#79747e',
  grey: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
};

// Material Design 3 Dark Theme Palette
const darkPalette: MaterialPalette = {
  primary: {
    main: '#d0bcff',
    light: '#eaddff',
    dark: '#9c47ff',
    contrastText: '#381e72',
  },
  secondary: {
    main: '#03DAC6', // Keep secondary consistent
    light: '#66fff9',
    dark: '#00a896',
    contrastText: '#003d36',
  },
  surface: {
    main: '#121212', // Dark surface from requirements
    light: '#1e1e1e',
    dark: '#000000',
    contrastText: '#e6e1e5',
  },
  error: {
    main: '#ffb4ab',
    light: '#ffdad6',
    dark: '#93000a',
    contrastText: '#690005',
  },
  background: '#100e13',
  onSurface: '#e6e1e5',
  onPrimary: '#381e72',
  onSecondary: '#003d36',
  onError: '#690005',
  outline: '#938f99',
  outlineVariant: '#49454f',
  surfaceVariant: '#49454f',
  onSurfaceVariant: '#cac4d0',
  text: {
    primary: '#e6e1e5',
    secondary: '#cac4d0',
    disabled: '#e6e1e561', // 38% opacity
  },
  action: {
    hover: '#e6e1e508', // 8% opacity
    disabled: '#e6e1e538', // 38% opacity
  },
  divider: '#938f99',
  grey: {
    50: '#121212',
    100: '#1e1e1e',
    200: '#2d2d2d',
    300: '#404040',
    400: '#5f5f5f',
    500: '#9e9e9e',
    600: '#c2c2c2',
    700: '#e0e0e0',
    800: '#f5f5f5',
    900: '#fafafa',
  },
};

// Base theme configuration shared between light and dark modes
const baseTheme = {
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  shape: {
    borderRadius: {
      xs: '4px',
      sm: '8px',
      md: '12px', // Primary border radius from requirements (12-16px)
      lg: '16px', // Primary border radius from requirements (12-16px)
      xl: '20px',
      xxl: '24px',
    },
  },
  elevation: {
    none: 'none',
    low: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
    medium: '0px 1px 3px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)',
    high: '0px 4px 4px rgba(0, 0, 0, 0.3), 0px 8px 12px 6px rgba(0, 0, 0, 0.15)',
  },
  typography: {
    fontFamily: 'Roboto, Inter, system-ui, sans-serif',
    fontSize: {
      displayLarge: '57px',
      displayMedium: '45px',
      displaySmall: '36px',
      headlineLarge: '32px',
      headlineMedium: '28px',
      headlineSmall: '24px',
      titleLarge: '22px',
      titleMedium: '16px',
      titleSmall: '14px',
      labelLarge: '14px',
      labelMedium: '12px',
      labelSmall: '11px',
      bodyLarge: '16px',
      bodyMedium: '14px',
      bodySmall: '12px',
    },
    fontWeight: {
      light: 300,
      regular: 400,
      medium: 500,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  breakpoints: {
    xs: '480px',
    sm: '600px',
    md: '840px',
    lg: '1200px',
    xl: '1600px',
  },
  shadows: [
    'none',
    '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)',
    '0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12)',
    '0px 3px 3px -2px rgba(0,0,0,0.2),0px 3px 4px 0px rgba(0,0,0,0.14),0px 1px 8px 0px rgba(0,0,0,0.12)',
    '0px 2px 4px -1px rgba(0,0,0,0.2),0px 4px 5px 0px rgba(0,0,0,0.14),0px 1px 10px 0px rgba(0,0,0,0.12)',
    '0px 3px 5px -1px rgba(0,0,0,0.2),0px 5px 8px 0px rgba(0,0,0,0.14),0px 1px 14px 0px rgba(0,0,0,0.12)',
    '0px 3px 5px -1px rgba(0,0,0,0.2),0px 6px 10px 0px rgba(0,0,0,0.14),0px 1px 18px 0px rgba(0,0,0,0.12)',
    '0px 4px 5px -2px rgba(0,0,0,0.2),0px 7px 10px 1px rgba(0,0,0,0.14),0px 2px 16px 1px rgba(0,0,0,0.12)',
    '0px 5px 5px -3px rgba(0,0,0,0.2),0px 8px 10px 1px rgba(0,0,0,0.14),0px 3px 14px 2px rgba(0,0,0,0.12)',
  ],
};

// Create light theme
export const lightTheme: MaterialThemeConfig = {
  mode: 'light' as ThemeMode,
  palette: lightPalette,
  ...baseTheme,
};

// Create dark theme
export const darkTheme: MaterialThemeConfig = {
  mode: 'dark' as ThemeMode,
  palette: darkPalette,
  ...baseTheme,
};

// Theme factory function
export const createMaterialTheme = (mode: ThemeMode, settings?: any): MaterialThemeConfig => {
  let baseTheme: MaterialThemeConfig;

  if (mode === 'auto') {
    // Detect system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    baseTheme = prefersDark ? darkTheme : lightTheme;
  } else {
    baseTheme = mode === 'dark' ? darkTheme : lightTheme;
  }

  // Apply custom colors if enabled
  if (settings?.enableCustomColors) {
    const customTheme = { ...baseTheme };

    if (settings.customPrimaryColor) {
      customTheme.palette = {
        ...customTheme.palette,
        primary: {
          ...customTheme.palette.primary,
          main: settings.customPrimaryColor,
          light: lightenColor(settings.customPrimaryColor, 0.2),
          dark: darkenColor(settings.customPrimaryColor, 0.2),
        },
      };
    }

    if (settings.customSecondaryColor) {
      customTheme.palette = {
        ...customTheme.palette,
        secondary: {
          ...customTheme.palette.secondary,
          main: settings.customSecondaryColor,
          light: lightenColor(settings.customSecondaryColor, 0.2),
          dark: darkenColor(settings.customSecondaryColor, 0.2),
        },
      };
    }

    return customTheme;
  }

  return baseTheme;
};

// Color utility functions
const lightenColor = (color: string, amount: number): string => {
  // Simple color lightening - in production, use a proper color library
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * amount));
  const g = Math.min(
    255,
    Math.floor(((num >> 8) & 0x00ff) + (255 - ((num >> 8) & 0x00ff)) * amount)
  );
  const b = Math.min(255, Math.floor((num & 0x0000ff) + (255 - (num & 0x0000ff)) * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

const darkenColor = (color: string, amount: number): string => {
  // Simple color darkening - in production, use a proper color library
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.max(0, Math.floor((num >> 16) * (1 - amount)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0x00ff) * (1 - amount)));
  const b = Math.max(0, Math.floor((num & 0x0000ff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

// Default theme
export const defaultTheme = lightTheme;

// Theme utilities
export const getContrastRatio = (foreground: string, background: string): number => {
  // Simplified contrast ratio calculation
  // In a real implementation, you'd use a proper color library
  return 4.5; // Placeholder - meets WCAG AA standard
};

export const isHighContrast = (theme: MaterialThemeConfig): boolean => {
  return getContrastRatio(theme.palette.onSurface, theme.palette.surface.main) >= 7;
};

export const getElevationShadow = (level: 'none' | 'low' | 'medium' | 'high'): string => {
  return baseTheme.elevation[level];
};
