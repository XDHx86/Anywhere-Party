/**
 * Material Design 3 Button Component
 * Button component with Material Design 3 states and styling
 */

import React, { forwardRef } from 'react';
import { Button, ButtonProps, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { MaterialButtonProps } from './types';
import { useMaterialTheme } from '../../theme/theme-provider';
import { createTransition } from '../../animations/material-animations';

// Styled button component
const StyledButton = styled(Button, {
  shouldForwardProp: (prop) =>
    !['materialVariant', 'materialSize', 'materialColor', 'loading', 'fullWidth'].includes(
      prop as string
    ),
})<{
  materialVariant: MaterialButtonProps['variant'];
  materialSize: MaterialButtonProps['size'];
  materialColor: MaterialButtonProps['color'];
  loading?: boolean;
}>(({ theme, materialVariant, materialSize, materialColor, loading }) => ({
  borderRadius: '20px', // Material Design 3 button border radius
  textTransform: 'none',
  fontWeight: 500,
  position: 'relative',
  overflow: 'hidden',

  // Size variants
  ...(materialSize === 'small' && {
    padding: '6px 16px',
    fontSize: '0.875rem',
    minHeight: '32px',
  }),

  ...(materialSize === 'medium' && {
    padding: '8px 24px',
    fontSize: '0.875rem',
    minHeight: '40px',
  }),

  ...(materialSize === 'large' && {
    padding: '12px 32px',
    fontSize: '1rem',
    minHeight: '48px',
  }),

  // Variant styles
  ...(materialVariant === 'filled' && {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    boxShadow: theme.shadows[1],
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
      boxShadow: theme.shadows[2],
    },
  }),

  ...(materialVariant === 'outlined' && {
    backgroundColor: 'transparent',
    color: theme.palette.primary.main,
    border: `1px solid ${theme.palette.primary.main}`,
    '&:hover': {
      backgroundColor: theme.palette.primary.main + '08', // 8% opacity
      borderColor: theme.palette.primary.dark,
    },
  }),

  ...(materialVariant === 'text' && {
    backgroundColor: 'transparent',
    color: theme.palette.primary.main,
    boxShadow: 'none',
    '&:hover': {
      backgroundColor: theme.palette.primary.main + '08', // 8% opacity
    },
  }),

  ...(materialVariant === 'elevated' && {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.primary.main,
    boxShadow: theme.shadows[2],
    '&:hover': {
      backgroundColor: theme.palette.grey[50],
      boxShadow: theme.shadows[4],
    },
  }),

  ...(materialVariant === 'tonal' && {
    backgroundColor: theme.palette.primary.main + '12', // 12% opacity
    color: theme.palette.primary.main,
    '&:hover': {
      backgroundColor: theme.palette.primary.main + '16', // 16% opacity
    },
  }),

  // Color variants
  ...(materialColor === 'secondary' && {
    ...(materialVariant === 'filled' && {
      backgroundColor: theme.palette.secondary.main,
      color: theme.palette.secondary.contrastText,
      '&:hover': {
        backgroundColor: theme.palette.secondary.dark,
      },
    }),
    ...(materialVariant !== 'filled' && {
      color: theme.palette.secondary.main,
      borderColor: theme.palette.secondary.main,
    }),
  }),

  ...(materialColor === 'error' && {
    ...(materialVariant === 'filled' && {
      backgroundColor: theme.palette.error.main,
      color: theme.palette.error.contrastText,
      '&:hover': {
        backgroundColor: theme.palette.error.dark,
      },
    }),
    ...(materialVariant !== 'filled' && {
      color: theme.palette.error.main,
      borderColor: theme.palette.error.main,
    }),
  }),

  // Loading state
  ...(loading && {
    pointerEvents: 'none',
  }),

  // Enhanced ripple effect with Material Design 3 motion
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle, transparent 1%, currentColor 1%)',
    backgroundSize: '15000%',
    transition: createTransition('background-size', 'medium2', 'standard'),
    opacity: 0,
    borderRadius: 'inherit',
  },

  '&:active::before': {
    backgroundSize: '100%',
    opacity: 0.12,
    transition: createTransition('background-size', 'short1', 'accelerate'),
  },

  // Hover state with smooth transition
  '&:hover': {
    transform: 'translateY(-1px)',
    transition: createTransition(['transform', 'box-shadow'], 'short4', 'standard'),
  },

  // Focus state with enhanced visibility
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
    transition: createTransition('outline', 'short2', 'standard'),
  },

  // Disabled styles
  '&.Mui-disabled': {
    opacity: 0.38,
    pointerEvents: 'none',
  },
}));

// Loading spinner component
const LoadingSpinner = styled(CircularProgress)(() => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  color: 'inherit',
}));

// Material Button component
export const MaterialButton = forwardRef<HTMLButtonElement, MaterialButtonProps>(
  (
    {
      variant = 'filled',
      size = 'medium',
      color = 'primary',
      startIcon,
      endIcon,
      loading = false,
      fullWidth = false,
      disabled = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    useMaterialTheme();

    const buttonProps: ButtonProps = {
      ref,
      disabled: disabled || loading,
      fullWidth,
      className,
      startIcon: loading ? undefined : startIcon,
      endIcon: loading ? undefined : endIcon,
      ...props,
    };

    return (
      <StyledButton
        {...buttonProps}
        variant={variant === 'filled' ? 'contained' : variant === 'outlined' ? 'outlined' : 'text'}
        size={size}
        color={
          color === 'surface'
            ? 'primary'
            : color === 'secondary'
              ? 'secondary'
              : color === 'error'
                ? 'error'
                : 'primary'
        }
        materialVariant={variant}
        materialSize={size}
        materialColor={color}
        loading={loading}
        sx={{
          ...(loading && {
            color: 'transparent',
          }),
        }}
      >
        {loading && <LoadingSpinner size={size === 'small' ? 16 : size === 'large' ? 24 : 20} />}
        {children}
      </StyledButton>
    );
  }
);

MaterialButton.displayName = 'MaterialButton';

export default MaterialButton;
