/**
 * Material Design 3 Theme Provider
 * Provides theme context and management for the entire application
 * Requirements: 26.4, 28.4
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Fade } from '@mui/material';
import { MaterialThemeConfig, ThemeContextValue, ThemeMode } from './types';
import { createMaterialTheme } from './material-theme';
import { themePersistence, ThemeSettings } from './theme-persistence';

// Create theme context
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Theme provider props
interface MaterialThemeProviderProps {
  children: ReactNode;
  initialMode?: ThemeMode;
}

// Convert Material theme to MUI theme
const createMuiTheme = (materialTheme: MaterialThemeConfig) => {
  return createTheme({
    palette: {
      mode: materialTheme.mode === 'dark' ? 'dark' : 'light',
      primary: {
        main: materialTheme.palette.primary.main,
        light: materialTheme.palette.primary.light,
        dark: materialTheme.palette.primary.dark,
        contrastText: materialTheme.palette.primary.contrastText,
      },
      secondary: {
        main: materialTheme.palette.secondary.main,
        light: materialTheme.palette.secondary.light,
        dark: materialTheme.palette.secondary.dark,
        contrastText: materialTheme.palette.secondary.contrastText,
      },
      error: {
        main: materialTheme.palette.error.main,
        light: materialTheme.palette.error.light,
        dark: materialTheme.palette.error.dark,
        contrastText: materialTheme.palette.error.contrastText,
      },
      background: {
        default: materialTheme.palette.background,
        paper: materialTheme.palette.surface.main,
      },
      text: {
        primary: materialTheme.palette.onSurface,
        secondary: materialTheme.palette.onSurfaceVariant,
      },
    },
    typography: {
      fontFamily: materialTheme.typography.fontFamily,
      h1: {
        fontSize: materialTheme.typography.fontSize.displayLarge,
        fontWeight: materialTheme.typography.fontWeight.regular,
        lineHeight: materialTheme.typography.lineHeight.tight,
      },
      h2: {
        fontSize: materialTheme.typography.fontSize.displayMedium,
        fontWeight: materialTheme.typography.fontWeight.regular,
        lineHeight: materialTheme.typography.lineHeight.tight,
      },
      h3: {
        fontSize: materialTheme.typography.fontSize.displaySmall,
        fontWeight: materialTheme.typography.fontWeight.regular,
        lineHeight: materialTheme.typography.lineHeight.tight,
      },
      h4: {
        fontSize: materialTheme.typography.fontSize.headlineLarge,
        fontWeight: materialTheme.typography.fontWeight.regular,
        lineHeight: materialTheme.typography.lineHeight.normal,
      },
      h5: {
        fontSize: materialTheme.typography.fontSize.headlineMedium,
        fontWeight: materialTheme.typography.fontWeight.regular,
        lineHeight: materialTheme.typography.lineHeight.normal,
      },
      h6: {
        fontSize: materialTheme.typography.fontSize.headlineSmall,
        fontWeight: materialTheme.typography.fontWeight.regular,
        lineHeight: materialTheme.typography.lineHeight.normal,
      },
      body1: {
        fontSize: materialTheme.typography.fontSize.bodyLarge,
        fontWeight: materialTheme.typography.fontWeight.regular,
        lineHeight: materialTheme.typography.lineHeight.normal,
      },
      body2: {
        fontSize: materialTheme.typography.fontSize.bodyMedium,
        fontWeight: materialTheme.typography.fontWeight.regular,
        lineHeight: materialTheme.typography.lineHeight.normal,
      },
      button: {
        fontSize: materialTheme.typography.fontSize.labelLarge,
        fontWeight: materialTheme.typography.fontWeight.medium,
        textTransform: 'none',
      },
    },
    shape: {
      borderRadius: parseInt(materialTheme.shape.borderRadius.md),
    },
    spacing: 8, // Base spacing unit (8px)
    breakpoints: {
      values: {
        xs: parseInt(materialTheme.breakpoints.xs),
        sm: parseInt(materialTheme.breakpoints.sm),
        md: parseInt(materialTheme.breakpoints.md),
        lg: parseInt(materialTheme.breakpoints.lg),
        xl: parseInt(materialTheme.breakpoints.xl),
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: materialTheme.shape.borderRadius.lg,
            boxShadow: materialTheme.elevation.low,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: materialTheme.shape.borderRadius.lg,
            textTransform: 'none',
            fontWeight: materialTheme.typography.fontWeight.medium,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: materialTheme.shape.borderRadius.md,
            },
          },
        },
      },
    },
  });
};

// Theme provider component
export const MaterialThemeProvider: React.FC<MaterialThemeProviderProps> = ({
  children,
  initialMode = 'auto',
}) => {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const [theme, setTheme] = useState<MaterialThemeConfig>(() => createMaterialTheme(initialMode));
  const [themeSettings, setThemeSettings] = useState<ThemeSettings | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted theme settings on mount
  useEffect(() => {
    const loadPersistedTheme = async () => {
      try {
        const settings = await themePersistence.loadThemeSettings();
        setThemeSettings(settings);
        setMode(settings.mode);
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load theme settings:', error);
        setIsLoaded(true);
      }
    };

    loadPersistedTheme();
  }, []);

  // Listen for theme settings changes from other contexts
  useEffect(() => {
    const unsubscribe = themePersistence.onThemeSettingsChanged((settings) => {
      setThemeSettings(settings);
      setMode(settings.mode);
    });

    return unsubscribe;
  }, []);

  // Update theme when mode or settings change with smooth transition
  useEffect(() => {
    if (!isLoaded) return;

    setIsTransitioning(true);

    // Small delay to allow transition to start
    const transitionTimer = setTimeout(() => {
      const newTheme = createMaterialTheme(mode, themeSettings);
      setTheme(newTheme);

      // Apply CSS custom properties for Tailwind integration with transition
      const root = document.documentElement;

      // Add transition to root element
      root.style.transition = 'color 0.3s ease, background-color 0.3s ease';

      // Apply theme colors
      root.style.setProperty('--color-primary', newTheme.palette.primary.main);
      root.style.setProperty('--color-secondary', newTheme.palette.secondary.main);
      root.style.setProperty('--color-surface', newTheme.palette.surface.main);
      root.style.setProperty('--color-background', newTheme.palette.background);
      root.style.setProperty('--color-on-surface', newTheme.palette.onSurface);
      root.style.setProperty('--color-error', newTheme.palette.error.main);

      // Apply elevation shadows
      root.style.setProperty('--elevation-low', newTheme.elevation.low);
      root.style.setProperty('--elevation-medium', newTheme.elevation.medium);
      root.style.setProperty('--elevation-high', newTheme.elevation.high);

      // Apply border radius
      root.style.setProperty('--border-radius-md', newTheme.shape.borderRadius.md);
      root.style.setProperty('--border-radius-lg', newTheme.shape.borderRadius.lg);

      // Apply compact mode if enabled
      if (themeSettings?.compactMode) {
        root.style.setProperty('--spacing-scale', '0.75');
      } else {
        root.style.setProperty('--spacing-scale', '1');
      }

      // Apply animation preferences
      if (themeSettings?.animationsEnabled === false) {
        root.style.setProperty('--animation-duration', '0ms');
        root.style.setProperty('--transition-duration', '0ms');
      } else {
        root.style.setProperty('--animation-duration', '200ms');
        root.style.setProperty('--transition-duration', '300ms');
      }

      // End transition after animation completes
      setTimeout(() => {
        setIsTransitioning(false);
        root.style.transition = '';
      }, 300);
    }, 50);

    return () => clearTimeout(transitionTimer);
  }, [mode, themeSettings, isLoaded]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (mode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        // Trigger theme update by updating the theme state
        const newTheme = createMaterialTheme('auto', themeSettings);
        setTheme(newTheme);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    return;
  }, [mode, themeSettings]);

  const toggleTheme = async () => {
    const newMode: ThemeMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'auto' : 'light';
    setMode(newMode);

    try {
      await themePersistence.updateThemeSetting('mode', newMode);
    } catch (error) {
      console.error('Failed to persist theme mode:', error);
    }
  };

  const setThemeMode = async (newMode: ThemeMode) => {
    setMode(newMode);

    try {
      await themePersistence.updateThemeSetting('mode', newMode);
    } catch (error) {
      console.error('Failed to persist theme mode:', error);
    }
  };

  const updateThemeSettings = async (updates: Partial<ThemeSettings>) => {
    if (!themeSettings) return;

    const newSettings = { ...themeSettings, ...updates };
    setThemeSettings(newSettings);

    try {
      await themePersistence.saveThemeSettings(newSettings);
    } catch (error) {
      console.error('Failed to persist theme settings:', error);
    }
  };

  const contextValue: ThemeContextValue = {
    theme,
    mode,
    toggleTheme,
    setTheme: setThemeMode,
    themeSettings: themeSettings || undefined,
    updateThemeSettings,
    isTransitioning,
  };

  const muiTheme = createMuiTheme(theme);

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        <Fade in={!isTransitioning} timeout={300}>
          <div style={{ minHeight: '100vh' }}>{children}</div>
        </Fade>
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// Hook to use theme context
export const useMaterialTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useMaterialTheme must be used within a MaterialThemeProvider');
  }
  return context;
};

// Hook to get current theme config
export const useThemeConfig = (): MaterialThemeConfig => {
  const { theme } = useMaterialTheme();
  return theme;
};

// Hook to get theme mode
export const useThemeMode = (): [ThemeMode, (mode: ThemeMode) => void] => {
  const { mode, setTheme } = useMaterialTheme();
  return [mode, setTheme];
};
