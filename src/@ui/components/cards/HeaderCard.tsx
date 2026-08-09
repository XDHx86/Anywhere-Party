/**
 * Header Card Component
 * Extension logo and name display for popup interface
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { MaterialCard } from './MaterialCard';
import { MaterialIcon } from './MaterialIcon';

// Styled components
const HeaderContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(1, 0),
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  borderRadius: theme.shape.borderRadius,
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  color: theme.palette.primary.contrastText,
}));

const TitleContainer = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
});

const ExtensionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightMedium,
  color: theme.palette.text.primary,
  lineHeight: 1.2,
}));

const ExtensionSubtitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: theme.typography.body2.fontSize,
  lineHeight: 1.2,
}));

// Header Card Props
export interface HeaderCardProps {
  title?: string;
  subtitle?: string;
  logoIcon?: string;
  className?: string;
  'data-testid'?: string;
}

// Header Card Component
export const HeaderCard: React.FC<HeaderCardProps> = ({
  title = 'Watch Party',
  subtitle = 'Synchronized video viewing',
  logoIcon = 'users',
  className,
  'data-testid': testId,
}) => {
  return (
    <MaterialCard
      elevation="none"
      variant="filled"
      padding="md"
      className={className}
      data-testid={testId}
    >
      <HeaderContainer>
        <LogoContainer>
          <MaterialIcon name={logoIcon} size="medium" color="inherit" />
        </LogoContainer>

        <TitleContainer>
          <ExtensionTitle variant="h6">{title}</ExtensionTitle>
          <ExtensionSubtitle variant="body2">{subtitle}</ExtensionSubtitle>
        </TitleContainer>
      </HeaderContainer>
    </MaterialCard>
  );
};

export default HeaderCard;
