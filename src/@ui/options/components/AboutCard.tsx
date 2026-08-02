/**
 * About Settings Card Component
 * Implements Material Design 3 card for version information and links
 * Requirements: 26.2, 26.3, 26.4
 */

import React from 'react';
import { MaterialCard } from '../../components/cards/MaterialCard';
import { MaterialButton } from '../../components/cards/MaterialButton';
import { Typography, Box, Divider, Link } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useMaterialTheme } from '../../theme';
import { MaterialIcon } from '../../components/cards/MaterialIcon';

export interface AboutCardProps {
  version?: string;
  buildDate?: string;
  changelogUrl?: string;
  repositoryUrl?: string;
  supportUrl?: string;
  className?: string;
}

// Styled components
const CardTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.25rem',
  fontWeight: 600,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(2),
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(3),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.primary.main + '08', // 8% opacity
  borderRadius: '12px',
}));

const LogoIcon = styled(Box)(({ theme }) => ({
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  backgroundColor: theme.palette.primary.main,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.primary.contrastText,
  fontSize: '24px',
  fontWeight: 'bold',
}));

const InfoGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(3),
}));

const InfoItem = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: '#e7e0ec', // Material surfaceVariant color
  borderRadius: '8px',
  border: '1px solid #cac4d0', // Material outlineVariant color
}));

const InfoLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  fontWeight: 500,
  color: theme.palette.text.secondary,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: theme.spacing(0.5),
}));

const InfoValue = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  fontWeight: 500,
  color: theme.palette.text.primary,
}));

const LinksContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
}));

const LinkItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1.5),
  borderRadius: '8px',
  transition: 'background-color 0.2s ease',

  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const StyledDivider = styled(Divider)(({ theme }) => ({
  margin: theme.spacing(3, 0),
  backgroundColor: '#cac4d0', // Material outlineVariant color
}));

const FeatureList = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
}));

const FeatureItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  fontSize: '0.875rem',
  color: theme.palette.text.secondary,
}));

export const AboutCard: React.FC<AboutCardProps> = ({
  version = '1.0.0',
  buildDate = new Date().toLocaleDateString(),
  changelogUrl = '#',
  repositoryUrl = '#',
  supportUrl = '#',
  className,
}) => {
  const { theme } = useMaterialTheme();

  const features = [
    'Synchronized video playback',
    'Real-time voice chat',
    'Text messaging & reactions',
    'Collaborative annotations',
    'Multi-language subtitles',
    'Playlist management',
    'Scheduled watch parties',
    'Cross-browser support',
    'Material Design 3 UI',
    'Accessibility features',
  ];

  const handleLinkClick = (url: string) => {
    if (url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <MaterialCard
      elevation="low"
      variant="elevated"
      rounded="lg"
      padding="lg"
      className={className}
    >
      <CardTitle variant="h2">About Watch Party Extension</CardTitle>

      {/* Logo and Basic Info */}
      <LogoContainer>
        <LogoIcon>WP</LogoIcon>
        <Box>
          <Typography variant="h6" fontWeight={600}>
            Watch Party Extension
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Synchronized video viewing for everyone
          </Typography>
        </Box>
      </LogoContainer>

      {/* Version Information */}
      <InfoGrid>
        <InfoItem>
          <InfoLabel>Version</InfoLabel>
          <InfoValue>{version}</InfoValue>
        </InfoItem>

        <InfoItem>
          <InfoLabel>Build Date</InfoLabel>
          <InfoValue>{buildDate}</InfoValue>
        </InfoItem>

        <InfoItem>
          <InfoLabel>Browser Support</InfoLabel>
          <InfoValue>Chrome, Firefox</InfoValue>
        </InfoItem>

        <InfoItem>
          <InfoLabel>License</InfoLabel>
          <InfoValue>MIT License</InfoValue>
        </InfoItem>
      </InfoGrid>

      <StyledDivider />

      {/* Features */}
      <Typography variant="h6" fontWeight={500} sx={{ mb: 2 }}>
        Features
      </Typography>

      <FeatureList>
        {features.map((feature, index) => (
          <FeatureItem key={index}>
            <MaterialIcon name="check_circle" size="small" color="primary" />
            {feature}
          </FeatureItem>
        ))}
      </FeatureList>

      <StyledDivider />

      {/* Links */}
      <Typography variant="h6" fontWeight={500} sx={{ mb: 2 }}>
        Links & Support
      </Typography>

      <LinksContainer>
        <LinkItem>
          <MaterialIcon name="history" size="medium" color="primary" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={500}>
              Changelog
            </Typography>
            <Typography variant="caption" color="text.secondary">
              View release notes and updates
            </Typography>
          </Box>
          <MaterialButton
            variant="text"
            size="small"
            onClick={() => handleLinkClick(changelogUrl)}
            endIcon={<MaterialIcon name="open_in_new" size="small" />}
          >
            View
          </MaterialButton>
        </LinkItem>

        <LinkItem>
          <MaterialIcon name="code" size="medium" color="primary" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={500}>
              Source Code
            </Typography>
            <Typography variant="caption" color="text.secondary">
              View on GitHub repository
            </Typography>
          </Box>
          <MaterialButton
            variant="text"
            size="small"
            onClick={() => handleLinkClick(repositoryUrl)}
            endIcon={<MaterialIcon name="open_in_new" size="small" />}
          >
            GitHub
          </MaterialButton>
        </LinkItem>

        <LinkItem>
          <MaterialIcon name="help" size="medium" color="primary" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={500}>
              Support & Help
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Get help and report issues
            </Typography>
          </Box>
          <MaterialButton
            variant="text"
            size="small"
            onClick={() => handleLinkClick(supportUrl)}
            endIcon={<MaterialIcon name="open_in_new" size="small" />}
          >
            Support
          </MaterialButton>
        </LinkItem>
      </LinksContainer>

      <StyledDivider />

      {/* Footer */}
      <Box sx={{ textAlign: 'center', pt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Made with ❤️ for synchronized video experiences
        </Typography>
      </Box>
    </MaterialCard>
  );
};

export default AboutCard;
