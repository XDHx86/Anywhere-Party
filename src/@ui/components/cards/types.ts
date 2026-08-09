/**
 * Material Design 3 Component Types
 * Shared types and interfaces for Material components
 */

import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';

// Base component props
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
  'data-testid'?: string;
}

// Elevation levels
export type ElevationLevel = 'none' | 'low' | 'medium' | 'high';

// Card variants
export type CardVariant = 'elevated' | 'filled' | 'outlined';

// Spacing sizes
export type SpacingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

// Border radius sizes
export type BorderRadiusSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

// Material Card Props
export interface MaterialCardProps extends BaseComponentProps {
  elevation?: ElevationLevel;
  variant?: CardVariant;
  rounded?: BorderRadiusSize;
  padding?: SpacingSize;
  onClick?: () => void;
  disabled?: boolean;
}

// Material Button Props
export interface MaterialButtonProps
  extends BaseComponentProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: 'filled' | 'outlined' | 'text' | 'elevated' | 'tonal';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'error' | 'surface';
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

// Material Input Props
export interface MaterialInputProps
  extends BaseComponentProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'size'> {
  label?: string;
  helperText?: string;
  error?: boolean;
  errorText?: string;
  variant?: 'outlined' | 'filled';
  size?: 'small' | 'medium';
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
  fullWidth?: boolean;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
}

// Material Icon Props
export interface MaterialIconProps extends BaseComponentProps {
  name: string;
  size?: 'small' | 'medium' | 'large' | number;
  color?: 'primary' | 'secondary' | 'error' | 'disabled' | 'inherit';
  fallback?: ReactNode;
}

// Animation states
export type AnimationState = 'idle' | 'hover' | 'focus' | 'pressed' | 'disabled';

// Component state
export interface ComponentState {
  loading?: boolean;
  error?: boolean;
  disabled?: boolean;
  focused?: boolean;
  hovered?: boolean;
  pressed?: boolean;
}
