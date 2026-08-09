/**
 * Material Design 3 Input Component
 * Input component with proper labeling, validation states, and accessibility
 */

import React, { forwardRef } from 'react';
import { TextField, TextFieldProps, InputAdornment } from '@mui/material';
import { styled } from '@mui/material/styles';
import { MaterialInputProps } from './types';

// Styled input component
const StyledTextField = styled(TextField, {
  shouldForwardProp: (prop) =>
    !['materialVariant', 'materialSize', 'error', 'fullWidth'].includes(prop as string),
})<{
  materialVariant: MaterialInputProps['variant'];
  materialSize: MaterialInputProps['size'];
}>(({ theme, materialVariant, materialSize }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px', // Material Design 3 input border radius
    backgroundColor:
      materialVariant === 'filled'
        ? theme.palette.mode === 'light'
          ? theme.palette.grey[50]
          : theme.palette.grey[900]
        : 'transparent',

    // Size variants
    ...(materialSize === 'small' && {
      fontSize: '0.875rem',
      '& .MuiOutlinedInput-input': {
        padding: '8px 12px',
      },
    }),

    ...(materialSize === 'medium' && {
      fontSize: '1rem',
      '& .MuiOutlinedInput-input': {
        padding: '12px 16px',
      },
    }),

    // Hover state
    '&:hover': {
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main,
      },
    },

    // Focus state
    '&.Mui-focused': {
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main,
        borderWidth: '2px',
      },
    },

    // Error state
    '&.Mui-error': {
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.error.main,
      },
    },

    // Disabled state
    '&.Mui-disabled': {
      backgroundColor: theme.palette.action.disabledBackground,
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.action.disabled,
      },
    },
  },

  '& .MuiInputLabel-root': {
    fontSize: materialSize === 'small' ? '0.875rem' : '1rem',

    // Focused label
    '&.Mui-focused': {
      color: theme.palette.primary.main,
    },

    // Error label
    '&.Mui-error': {
      color: theme.palette.error.main,
    },
  },

  '& .MuiFormHelperText-root': {
    fontSize: '0.75rem',
    marginTop: '4px',
    marginLeft: '4px',

    // Error helper text
    '&.Mui-error': {
      color: theme.palette.error.main,
    },
  },

  // Filled variant specific styles
  ...(materialVariant === 'filled' && {
    '& .MuiFilledInput-root': {
      borderRadius: '12px 12px 0 0',
      backgroundColor:
        theme.palette.mode === 'light' ? theme.palette.grey[50] : theme.palette.grey[900],

      '&:hover': {
        backgroundColor:
          theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[800],
      },

      '&.Mui-focused': {
        backgroundColor:
          theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[800],
      },
    },
  }),
}));

// Material Input component
export const MaterialInput = forwardRef<HTMLInputElement, MaterialInputProps>(
  (
    {
      label,
      helperText,
      error = false,
      errorText,
      variant = 'outlined',
      size = 'medium',
      startAdornment,
      endAdornment,
      fullWidth = false,
      className,
      inputProps,
      color: _color,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    const filteredProps = { ...props };

    const baseProps = {
      inputRef: ref,
      label,
      size: size as TextFieldProps['size'],
      error,
      helperText: error && errorText ? errorText : helperText,
      fullWidth,
      className,
      slotProps: {
        input: {
          startAdornment: startAdornment ? (
            <InputAdornment position="start">{startAdornment}</InputAdornment>
          ) : undefined,
          endAdornment: endAdornment ? (
            <InputAdornment position="end">{endAdornment}</InputAdornment>
          ) : undefined,
        },
        htmlInput: {
          'data-testid': testId,
          ...inputProps,
        },
      },
      ...filteredProps,
    };

    return (
      <StyledTextField
        {...baseProps}
        variant={variant}
        materialVariant={variant}
        materialSize={size}
      />
    );
  }
);

MaterialInput.displayName = 'MaterialInput';

export default MaterialInput;
