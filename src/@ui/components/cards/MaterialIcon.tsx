/**
 * Material Design 3 Icon Component
 * Enhanced icon wrapper with local font bundling and SVG fallbacks
 */

import React, { forwardRef, useEffect, useState } from 'react';
import { Icon, SvgIcon } from '@mui/material';
import { styled } from '@mui/material/styles';
import { MaterialIconProps } from './types';
import { useMaterialTheme } from '../../theme';
import { MaterialThemeConfig } from '../../theme/types';
import { assetSystem, AssetLoadResult } from '../../assets/asset-system';

// Size mapping
const sizeMap = {
  small: 16,
  medium: 24,
  large: 32,
};

// Color mapping for theme colors
const getIconColor = (color: MaterialIconProps['color'], theme: MaterialThemeConfig) => {
  switch (color) {
    case 'primary':
      return theme.palette.primary.main;
    case 'secondary':
      return theme.palette.secondary.main;
    case 'error':
      return theme.palette.error.main;
    case 'disabled':
      return theme.palette.action.disabled;
    case 'inherit':
    default:
      return 'inherit';
  }
};

// Styled icon component
const StyledIcon = styled(Icon, {
  shouldForwardProp: (prop) => !['iconSize', 'iconColor'].includes(prop as string),
})<{
  iconSize: number;
  iconColor: string;
}>(({ theme, iconSize, iconColor }) => ({
  fontSize: `${iconSize}px !important`,
  width: `${iconSize}px`,
  height: `${iconSize}px`,
  color: iconColor,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: theme.transitions.create(['color', 'transform'], {
    duration: theme.transitions.duration.short,
  }),

  // Font Awesome icon styles
  '&.fa, &.fas, &.far, &.fab, &.fal': {
    fontFamily: '"Font Awesome 6 Free", "Font Awesome 6 Pro"',
    fontWeight: 'normal',
    fontStyle: 'normal',
    display: 'inline-block',
    textRendering: 'auto',
    WebkitFontSmoothing: 'antialiased',
  },

  // Solid icons
  '&.fas': {
    fontWeight: 900,
  },

  // Regular icons
  '&.far': {
    fontWeight: 400,
  },

  // Brand icons
  '&.fab': {
    fontWeight: 400,
  },

  // Light icons (Pro only)
  '&.fal': {
    fontWeight: 300,
  },
}));

// Fallback icon component
const FallbackIcon = styled(SvgIcon, {
  shouldForwardProp: (prop) => !['iconSize', 'iconColor'].includes(prop as string),
})<{ iconSize: number; iconColor: string }>(({ iconSize, iconColor }) => ({
  fontSize: `${iconSize}px !important`,
  width: `${iconSize}px`,
  height: `${iconSize}px`,
  color: iconColor,
}));

// Default fallback SVG icon (question mark)
const DefaultFallbackIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <FallbackIcon iconSize={size} iconColor={color} viewBox="0 0 24 24">
    <path d="M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2ZM13,19H11V17H13V19ZM15.07,11.25L14.17,12.17C13.45,12.9 13,13.5 13,15H11V14.5C11,13.4 11.45,12.4 12.17,11.67L13.41,10.41C13.78,10.05 14,9.55 14,9C14,7.9 13.1,7 12,7C10.9,7 10,7.9 10,9H8C8,6.79 9.79,5 12,5C14.21,5 16,6.79 16,9C16,9.88 15.64,10.68 15.07,11.25Z" />
  </FallbackIcon>
);

// Enhanced Material Icon component with asset system integration
export const MaterialIcon = forwardRef<HTMLElement, MaterialIconProps>(
  (
    {
      name,
      size = 'medium',
      color = 'inherit',
      fallback,
      className,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    const { theme } = useMaterialTheme();
    const [loadResult, setLoadResult] = useState<AssetLoadResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const iconSize = typeof size === 'number' ? size : sizeMap[size];
    const iconColor = getIconColor(color, theme);

    // Load icon with fallback chain
    useEffect(() => {
      let mounted = true;

      const loadIcon = async () => {
        try {
          const result = await assetSystem.loadIcon(name);
          if (mounted) {
            setLoadResult(result);
            setIsLoading(false);
          }
        } catch {
          if (mounted) {
            setLoadResult({ success: true, method: 'fallback' });
            setIsLoading(false);
          }
        }
      };

      loadIcon();

      return () => {
        mounted = false;
      };
    }, [name]);

    // Show loading state
    if (isLoading) {
      return (
        <span
          ref={ref}
          className={className}
          data-testid={testId}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: iconSize,
            height: iconSize,
            color: iconColor,
          }}
          {...props}
        >
          ⋯
        </span>
      );
    }

    // Render based on load result
    if (loadResult?.success) {
      switch (loadResult.method) {
        case 'font': {
          const fontAwesomeClass = assetSystem.getFontAwesomeClass(name);
          if (fontAwesomeClass) {
            return (
              <StyledIcon
                ref={ref}
                className={`${fontAwesomeClass} ${className || ''}`}
                iconSize={iconSize}
                iconColor={iconColor}
                data-testid={testId}
                {...props}
              />
            );
          }
          break;
        }

        case 'svg': {
          const svgContent = assetSystem.getSVGFallback(name);
          if (svgContent) {
            return (
              <span
                ref={ref}
                className={className}
                data-testid={testId}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: iconSize,
                  height: iconSize,
                  color: iconColor,
                }}
                dangerouslySetInnerHTML={{ __html: svgContent }}
                {...props}
              />
            );
          }
          break;
        }

        case 'fallback': {
          const textFallback = assetSystem.getTextFallback(name);
          return (
            <span
              ref={ref}
              className={className}
              data-testid={testId}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: iconSize,
                height: iconSize,
                color: iconColor,
                fontSize: `${iconSize * 0.8}px`,
              }}
              {...props}
            >
              {textFallback}
            </span>
          );
        }
      }
    }

    // Custom fallback provided by user
    if (fallback) {
      return (
        <span
          ref={ref}
          className={className}
          data-testid={testId}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: iconSize,
            height: iconSize,
            color: iconColor,
          }}
          {...props}
        >
          {fallback}
        </span>
      );
    }

    // Final fallback
    return <DefaultFallbackIcon size={iconSize} color={iconColor} />;
  }
);

MaterialIcon.displayName = 'MaterialIcon';

export default MaterialIcon;
