/**
 * Material Design 3 Switch Component
 * Implements Material Design 3 switch with proper states and animations
 */

import React, { forwardRef } from 'react';
import { Switch, FormControlLabel, SwitchProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useMaterialTheme } from '../../theme';
import { createTransition } from '../../animations/material-animations';

export interface MaterialSwitchProps extends Omit<SwitchProps, 'size'> {
  label?: string;
  helperText?: string;
  size?: 'small' | 'medium';
  error?: boolean;
  className?: string;
  'data-testid'?: string;
}

// Styled switch component with Material Design 3 styling
const StyledSwitch = styled(Switch)(({ theme }) => ({
  width: 52,
  height: 32,
  padding: 0,

  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: 2,
    transitionDuration: '300ms',

    '&.Mui-checked': {
      transform: 'translateX(20px)',
      color: '#fff',

      '& + .MuiSwitch-track': {
        backgroundColor: theme.palette.primary.main,
        opacity: 1,
        border: 0,
      },

      '&.Mui-disabled + .MuiSwitch-track': {
        opacity: 0.5,
      },
    },

    '&.Mui-focusVisible .MuiSwitch-thumb': {
      color: theme.palette.primary.main,
      border: '6px solid #fff',
    },

    '&.Mui-disabled .MuiSwitch-thumb': {
      color: theme.palette.grey[100],
    },

    '&.Mui-disabled + .MuiSwitch-track': {
      opacity: 0.3,
    },
  },

  '& .MuiSwitch-thumb': {
    boxSizing: 'border-box',
    width: 28,
    height: 28,
    backgroundColor: '#fff',
    boxShadow: theme.shadows[1],
    transition: createTransition(['transform', 'box-shadow'], 'short4', 'standard'),

    '&:hover': {
      boxShadow: theme.shadows[2],
    },
  },

  '& .MuiSwitch-track': {
    borderRadius: 16,
    backgroundColor: theme.palette.grey[400],
    opacity: 1,
    transition: createTransition(['background-color'], 'short4', 'standard'),
  },

  // Small size variant
  '&.MuiSwitch-sizeSmall': {
    width: 40,
    height: 24,

    '& .MuiSwitch-switchBase': {
      margin: 1,

      '&.Mui-checked': {
        transform: 'translateX(16px)',
      },
    },

    '& .MuiSwitch-thumb': {
      width: 22,
      height: 22,
    },

    '& .MuiSwitch-track': {
      borderRadius: 12,
    },
  },
}));

// Styled form control label
const StyledFormControlLabel = styled(FormControlLabel)(({ theme }) => ({
  margin: 0,
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(2),

  '& .MuiFormControlLabel-label': {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: theme.palette.text.primary,
    lineHeight: 1.5,
  },

  '&.Mui-disabled .MuiFormControlLabel-label': {
    color: theme.palette.text.disabled,
  },
}));

// Helper text component
const HelperText = styled('div', {
  shouldForwardProp: (prop) => prop !== 'error',
})<{ error?: boolean }>(({ theme, error }) => ({
  fontSize: '0.75rem',
  color: error ? theme.palette.error.main : theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  marginLeft: theme.spacing(6), // Align with label text
  lineHeight: 1.4,
}));

export const MaterialSwitch = forwardRef<HTMLButtonElement, MaterialSwitchProps>(
  (
    {
      label,
      helperText,
      size = 'medium',
      error = false,
      className,
      disabled = false,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    useMaterialTheme();

    const switchElement = (
      <StyledSwitch
        {...props}
        ref={ref}
        size={size}
        disabled={disabled}
        slotProps={{
          input: {
            'aria-label': label || 'Switch',
          },
        }}
        data-testid={testId}
      />
    );

    if (!label && !helperText) {
      return switchElement;
    }

    return (
      <div className={className}>
        <StyledFormControlLabel control={switchElement} label={label} disabled={disabled} />
        {helperText && <HelperText error={error}>{helperText}</HelperText>}
      </div>
    );
  }
);

MaterialSwitch.displayName = 'MaterialSwitch';

export default MaterialSwitch;
