/**
 * Material Design 3 Select Component
 * Implements Material Design 3 dropdown with proper styling and states
 */

import React, { forwardRef } from 'react';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  SelectProps,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useMaterialTheme } from '../../theme';
import { createTransition } from '../../animations/material-animations';

export interface MaterialSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface MaterialSelectProps extends Omit<SelectProps, 'variant'> {
  label?: string;
  helperText?: string;
  error?: boolean;
  errorText?: string;
  options: MaterialSelectOption[];
  variant?: 'outlined' | 'filled';
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  className?: string;
  'data-testid'?: string;
}

// Styled form control
const StyledFormControl = styled(FormControl)(({ theme }) => ({
  '& .MuiInputLabel-root': {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: theme.palette.text.secondary,

    '&.Mui-focused': {
      color: theme.palette.primary.main,
    },

    '&.Mui-error': {
      color: theme.palette.error.main,
    },
  },

  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    backgroundColor: theme.palette.background.paper,
    transition: createTransition(['border-color', 'box-shadow'], 'short4', 'standard'),

    '& fieldset': {
      borderColor: '#79747e', // Material outline color
      borderWidth: '1px',
    },

    '&:hover fieldset': {
      borderColor: theme.palette.primary.main,
    },

    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
      borderWidth: '2px',
    },

    '&.Mui-error fieldset': {
      borderColor: theme.palette.error.main,
    },
  },

  '& .MuiFilledInput-root': {
    borderRadius: '12px 12px 0 0',
    backgroundColor: '#e7e0ec', // Material surfaceVariant color

    '&:hover': {
      backgroundColor: '#cac4d0', // Material surfaceVariant hover
    },

    '&.Mui-focused': {
      backgroundColor: '#e7e0ec', // Material surfaceVariant color
    },

    '&::before': {
      borderBottomColor: '#79747e', // Material outline color
    },

    '&:hover::before': {
      borderBottomColor: theme.palette.primary.main,
    },

    '&::after': {
      borderBottomColor: theme.palette.primary.main,
    },
  },
}));

// Styled select component
const StyledSelect = styled(Select)(({ theme }) => ({
  '& .MuiSelect-select': {
    fontSize: '0.875rem',
    padding: '12px 14px',

    '&.MuiInputBase-inputSizeSmall': {
      padding: '8px 14px',
      fontSize: '0.8125rem',
    },
  },

  '& .MuiSelect-icon': {
    color: theme.palette.text.secondary,
    transition: createTransition(['transform'], 'short4', 'standard'),
  },

  '&.Mui-focused .MuiSelect-icon': {
    transform: 'rotate(180deg)',
  },
}));

// Styled menu item
const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  fontSize: '0.875rem',
  padding: '12px 16px',
  minHeight: 'auto',
  borderRadius: '8px',
  margin: '2px 8px',
  transition: createTransition(['background-color'], 'short2', 'standard'),

  '&:hover': {
    backgroundColor: theme.palette.primary.main + '08', // 8% opacity
  },

  '&.Mui-selected': {
    backgroundColor: theme.palette.primary.main + '12', // 12% opacity

    '&:hover': {
      backgroundColor: theme.palette.primary.main + '16', // 16% opacity
    },
  },

  '&.Mui-disabled': {
    opacity: 0.38,
  },
}));

export const MaterialSelect = forwardRef<HTMLDivElement, MaterialSelectProps>(
  (
    {
      label,
      helperText,
      error = false,
      errorText,
      options,
      variant = 'outlined',
      size = 'medium',
      fullWidth = false,
      className,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    const { theme } = useMaterialTheme();

    const displayHelperText = error && errorText ? errorText : helperText;

    return (
      <StyledFormControl
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        error={error}
        className={className}
        ref={ref}
      >
        {label && <InputLabel id={`${testId}-label`}>{label}</InputLabel>}
        <StyledSelect
          {...props}
          labelId={label ? `${testId}-label` : undefined}
          label={label}
          MenuProps={{
            PaperProps: {
              sx: {
                borderRadius: '12px',
                boxShadow: theme.shadows[8],
                marginTop: '4px',
                '& .MuiList-root': {
                  padding: '8px',
                },
              },
            },
            transformOrigin: {
              vertical: 'top',
              horizontal: 'left',
            },
            anchorOrigin: {
              vertical: 'bottom',
              horizontal: 'left',
            },
          }}
          inputProps={{
            'data-testid': testId,
          }}
        >
          {options.map((option) => (
            <StyledMenuItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </StyledMenuItem>
          ))}
        </StyledSelect>
        {displayHelperText && <FormHelperText>{displayHelperText}</FormHelperText>}
      </StyledFormControl>
    );
  }
);

MaterialSelect.displayName = 'MaterialSelect';

export default MaterialSelect;
