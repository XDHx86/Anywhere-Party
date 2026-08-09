/**
 * Material Design 3 Slider Component
 * Implements Material Design 3 slider with proper styling and states
 */

import React, { forwardRef } from 'react';
import { Slider, SliderProps, Typography, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useMaterialTheme } from '../../theme';
import { createTransition } from '../../animations/material-animations';

export interface MaterialSliderProps extends Omit<SliderProps, 'size'> {
  label?: string;
  helperText?: string;
  error?: boolean;
  size?: 'small' | 'medium';
  showValue?: boolean;
  unit?: string;
  className?: string;
  'data-testid'?: string;
}

// Styled slider component with Material Design 3 styling
const StyledSlider = styled(Slider)(({ theme }) => ({
  color: theme.palette.primary.main,
  height: 4,
  padding: '13px 0',

  '& .MuiSlider-track': {
    border: 'none',
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.palette.primary.main,
  },

  '& .MuiSlider-rail': {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#79747e', // Material outline color
    opacity: 1,
  },

  '& .MuiSlider-thumb': {
    height: 20,
    width: 20,
    backgroundColor: theme.palette.primary.main,
    border: `2px solid ${theme.palette.background.paper}`,
    boxShadow: theme.shadows[2],
    transition: createTransition(['box-shadow', 'transform'], 'short4', 'standard'),

    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
      boxShadow: theme.shadows[4],
      transform: 'scale(1.2)',
    },

    '&::before': {
      display: 'none',
    },
  },

  '& .MuiSlider-valueLabel': {
    lineHeight: 1.2,
    fontSize: 12,
    background: 'unset',
    padding: 0,
    width: 32,
    height: 32,
    borderRadius: '50% 50% 50% 0',
    backgroundColor: theme.palette.primary.main,
    transformOrigin: 'bottom left',
    transform: 'translate(50%, -100%) rotate(-45deg) scale(0)',

    '&::before': { display: 'none' },

    '&.MuiSlider-valueLabelOpen': {
      transform: 'translate(50%, -100%) rotate(-45deg) scale(1)',
    },

    '& > *': {
      transform: 'rotate(45deg)',
    },
  },

  '& .MuiSlider-mark': {
    backgroundColor: '#79747e', // Material outline color
    height: 8,
    width: 2,
    borderRadius: 1,

    '&.MuiSlider-markActive': {
      backgroundColor: theme.palette.primary.main,
    },
  },

  '& .MuiSlider-markLabel': {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(1),
  },

  // Small size variant
  '&.MuiSlider-sizeSmall': {
    height: 3,
    padding: '10px 0',

    '& .MuiSlider-track': {
      height: 3,
    },

    '& .MuiSlider-rail': {
      height: 3,
    },

    '& .MuiSlider-thumb': {
      height: 16,
      width: 16,
    },

    '& .MuiSlider-mark': {
      height: 6,
    },
  },

  // Disabled state
  '&.Mui-disabled': {
    color: theme.palette.text.disabled,

    '& .MuiSlider-track': {
      backgroundColor: theme.palette.text.disabled,
    },

    '& .MuiSlider-rail': {
      backgroundColor: theme.palette.text.disabled,
      opacity: 0.3,
    },

    '& .MuiSlider-thumb': {
      backgroundColor: theme.palette.text.disabled,
      boxShadow: 'none',
    },
  },
}));

// Container component
const SliderContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

// Label component
const SliderLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  fontWeight: 500,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(1),
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

// Helper text component
const HelperText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'error',
})<{ error?: boolean }>(({ theme, error }) => ({
  fontSize: '0.75rem',
  color: error ? theme.palette.error.main : theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  lineHeight: 1.4,
}));

// Value display component
const ValueDisplay = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  fontWeight: 500,
  color: theme.palette.primary.main,
  minWidth: '60px',
  textAlign: 'right',
}));

export const MaterialSlider = forwardRef<HTMLSpanElement, MaterialSliderProps>(
  (
    {
      label,
      helperText,
      error = false,
      size = 'medium',
      showValue = false,
      unit = '',
      className,
      value,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    useMaterialTheme();

    const displayValue = Array.isArray(value) ? value.join(' - ') : value;
    const formattedValue = unit ? `${displayValue}${unit}` : displayValue;

    return (
      <SliderContainer className={className}>
        {(label || showValue) && (
          <SliderLabel>
            <span>{label}</span>
            {showValue && <ValueDisplay>{formattedValue}</ValueDisplay>}
          </SliderLabel>
        )}

        <StyledSlider {...props} ref={ref} size={size} value={value} data-testid={testId} />

        {helperText && <HelperText error={error}>{helperText}</HelperText>}
      </SliderContainer>
    );
  }
);

MaterialSlider.displayName = 'MaterialSlider';

export default MaterialSlider;
