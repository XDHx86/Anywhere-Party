/**
 * Material Design 3 Card Component
 * Base card component with elevation, variant, and styling props
 */

import React, { forwardRef } from 'react';
import { Card, CardProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  MaterialCardProps,
  ElevationLevel,
  CardVariant,
  SpacingSize,
  BorderRadiusSize,
} from './types';
import { useMaterialTheme } from '../../theme';
import { materialAnimations, createTransition } from '../../animations/material-animations';

// Elevation mapping
const elevationMap: Record<ElevationLevel, number> = {
  none: 0,
  low: 1,
  medium: 3,
  high: 5,
};

// Spacing mapping
const spacingMap: Record<SpacingSize, string> = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

// Border radius mapping
const borderRadiusMap: Record<BorderRadiusSize, string> = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
};

// Styled card component
const StyledCard = styled(Card, {
  shouldForwardProp: (prop) => !['materialVariant', 'rounded', 'padding'].includes(prop as string),
})<{
  materialVariant: CardVariant;
  rounded: BorderRadiusSize;
  padding: SpacingSize;
}>(({ theme, materialVariant, rounded, padding }) => ({
  borderRadius: borderRadiusMap[rounded as BorderRadiusSize],
  padding: spacingMap[padding as SpacingSize],
  transition: createTransition(
    ['box-shadow', 'transform', 'background-color'],
    'medium2',
    'standard'
  ),
  cursor: 'default',

  // Variant styles
  ...(materialVariant === 'elevated' && {
    backgroundColor: theme.palette.background.paper,
  }),

  ...(materialVariant === 'filled' && {
    backgroundColor:
      theme.palette.mode === 'light' ? theme.palette.grey[50] : theme.palette.grey[900],
    boxShadow: 'none',
  }),

  ...(materialVariant === 'outlined' && {
    backgroundColor: 'transparent',
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: 'none',
  }),

  // Enhanced hover effects with Material Design 3 motion
  '&:hover': {
    ...(materialVariant === 'elevated' && {
      transform: 'translateY(-4px) scale(1.01)',
      boxShadow: theme.shadows[6],
      transition: createTransition(['transform', 'box-shadow'], 'medium1', 'emphasized'),
    }),
    ...(materialVariant === 'filled' && {
      backgroundColor:
        theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[800],
      transform: 'scale(1.005)',
      transition: createTransition(['background-color', 'transform'], 'medium1', 'standard'),
    }),
    ...(materialVariant === 'outlined' && {
      borderColor: theme.palette.primary.main,
      backgroundColor: theme.palette.action.hover,
      transform: 'scale(1.005)',
      transition: createTransition(
        ['border-color', 'background-color', 'transform'],
        'medium1',
        'standard'
      ),
    }),
  },

  // Focus styles
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },

  // Disabled styles
  '&.Mui-disabled': {
    opacity: 0.6,
    pointerEvents: 'none',
  },
}));

// Material Card component
export const MaterialCard = forwardRef<HTMLDivElement, MaterialCardProps>(
  (
    {
      elevation = 'low',
      variant = 'elevated',
      rounded = 'lg',
      padding = 'md',
      onClick,
      disabled = false,
      className,
      children,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    const { theme } = useMaterialTheme();

    const cardProps: CardProps = {
      ref,
      elevation: elevationMap[elevation],
      onClick: disabled ? undefined : onClick,
      className,
      tabIndex: onClick && !disabled ? 0 : undefined,
      role: onClick ? 'button' : undefined,
      ...props,
    };

    return (
      <StyledCard
        {...cardProps}
        variant={variant === 'outlined' ? 'outlined' : 'elevation'}
        materialVariant={variant}
        rounded={rounded}
        padding={padding}
        sx={{
          cursor: onClick && !disabled ? 'pointer' : 'default',
          ...(disabled && {
            opacity: 0.6,
            pointerEvents: 'none',
          }),
        }}
      >
        {children}
      </StyledCard>
    );
  }
);

MaterialCard.displayName = 'MaterialCard';

export default MaterialCard;
