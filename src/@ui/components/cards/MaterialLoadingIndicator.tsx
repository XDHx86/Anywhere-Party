/**
 * Material Design 3 Loading Indicator Component
 * Progress indicators with Material motion principles
 */

import React from 'react';
import { Box, CircularProgress, LinearProgress } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import { useMaterialTheme } from '../../theme';
import { materialMotion, rotate, pulse } from '../../animations/material-animations';

// Pulse animation for skeleton loading
const skeletonPulse = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
`;

// Styled components
const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2),
}));

const StyledCircularProgress = styled(CircularProgress)(({ theme }) => ({
  animation: `${rotate} ${materialMotion.duration.extraLong1}ms linear infinite`,
  color: theme.palette.primary.main,
}));

const StyledLinearProgress = styled(LinearProgress)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  height: 4,
  backgroundColor:
    theme.palette.mode === 'light' ? theme.palette.grey[200] : theme.palette.grey[800],

  '& .MuiLinearProgress-bar': {
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.primary.main,
  },
}));

const SkeletonBox = styled(Box, {
  shouldForwardProp: (prop) => !['width', 'height', 'borderRadius'].includes(prop as string),
})<{
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}>(({ theme, width = '100%', height = 20, borderRadius = theme.shape.borderRadius }) => ({
  width,
  height,
  borderRadius,
  backgroundColor:
    theme.palette.mode === 'light' ? theme.palette.grey[200] : theme.palette.grey[700],
  animation: `${skeletonPulse} ${materialMotion.duration.long2}ms ${materialMotion.easing.standard} infinite`,
}));

const DotsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
}));

const Dot = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'delay',
})<{ delay: number }>(({ theme, delay }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main,
  animation: `${pulse} ${materialMotion.duration.long2}ms ${materialMotion.easing.standard} infinite`,
  animationDelay: `${delay}ms`,
}));

// Loading indicator types
export type LoadingType = 'circular' | 'linear' | 'skeleton' | 'dots';
export type LoadingSize = 'small' | 'medium' | 'large';

// Loading indicator props
export interface MaterialLoadingIndicatorProps {
  type?: LoadingType;
  size?: LoadingSize;
  color?: 'primary' | 'secondary' | 'inherit';
  progress?: number; // For determinate progress (0-100)
  width?: string | number;
  height?: string | number;
  className?: string;
  'data-testid'?: string;
}

// Size mappings
const sizeMap = {
  small: 16,
  medium: 24,
  large: 32,
};

// Material Loading Indicator Component
export const MaterialLoadingIndicator: React.FC<MaterialLoadingIndicatorProps> = ({
  type = 'circular',
  size = 'medium',
  color = 'primary',
  progress,
  width,
  height,
  className,
  'data-testid': testId,
}) => {
  const { theme } = useMaterialTheme();
  const sizeValue = sizeMap[size];

  const renderIndicator = () => {
    switch (type) {
      case 'circular':
        return (
          <LoadingContainer className={className} data-testid={testId}>
            <StyledCircularProgress
              size={sizeValue}
              color={color}
              variant={progress !== undefined ? 'determinate' : 'indeterminate'}
              value={progress}
            />
          </LoadingContainer>
        );

      case 'linear':
        return (
          <Box className={className} data-testid={testId} sx={{ width: width || '100%' }}>
            <StyledLinearProgress
              color={color}
              variant={progress !== undefined ? 'determinate' : 'indeterminate'}
              value={progress}
            />
          </Box>
        );

      case 'skeleton':
        return (
          <SkeletonBox
            className={className}
            data-testid={testId}
            width={width || '100%'}
            height={height || sizeValue}
            borderRadius={12}
          />
        );

      case 'dots':
        return (
          <DotsContainer className={className} data-testid={testId}>
            <Dot delay={0} />
            <Dot delay={150} />
            <Dot delay={300} />
          </DotsContainer>
        );

      default:
        return null;
    }
  };

  return renderIndicator();
};

// Skeleton loading component for complex layouts
export interface SkeletonLayoutProps {
  lines?: number;
  avatar?: boolean;
  button?: boolean;
  className?: string;
  'data-testid'?: string;
}

export const SkeletonLayout: React.FC<SkeletonLayoutProps> = ({
  lines = 3,
  avatar = false,
  button = false,
  className,
  'data-testid': testId,
}) => {
  const { theme } = useMaterialTheme();

  return (
    <Box className={className} data-testid={testId} sx={{ p: 2 }}>
      {avatar && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
          <SkeletonBox width={40} height={40} borderRadius="50%" />
          <Box sx={{ flex: 1 }}>
            <SkeletonBox width="60%" height={16} />
            <Box sx={{ mt: 0.5 }}>
              <SkeletonBox width="40%" height={12} />
            </Box>
          </Box>
        </Box>
      )}

      {Array.from({ length: lines }).map((_, index) => (
        <Box key={index} sx={{ mb: 1 }}>
          <SkeletonBox width={index === lines - 1 ? '80%' : '100%'} height={14} />
        </Box>
      ))}

      {button && (
        <Box sx={{ mt: 2 }}>
          <SkeletonBox width={120} height={36} borderRadius={20} />
        </Box>
      )}
    </Box>
  );
};

export default MaterialLoadingIndicator;
