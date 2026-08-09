/**
 * Accessibility Settings Card Component
 * Implements Material Design 3 card for accessibility options with advanced settings hidden by default
 * Requirements: 26.2, 26.3, 26.4
 */

import React, { useState } from 'react';
import { MaterialCard } from '../../components/cards/MaterialCard';
import { MaterialInput } from '../../components/cards/MaterialInput';
import { MaterialSwitch } from '../../components/cards/MaterialSwitch';
import { MaterialSelect } from '../../components/cards/MaterialSelect';
import { MaterialButton } from '../../components/cards/MaterialButton';
import { Typography, Box, Divider, Collapse } from '@mui/material';
import { styled } from '@mui/material/styles';
import { MaterialIcon } from '../../components/cards/MaterialIcon';

export interface AccessibilitySettingsData {
  keyboardNavigationEnabled: boolean;
  screenReaderEnabled: boolean;
  highContrastMode: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  reducedMotion: boolean;
  focusIndicatorStyle: 'default' | 'high-contrast' | 'custom';
  customColors: {
    background: string;
    foreground: string;
    accent: string;
    border: string;
  };
  captionStyling: {
    fontSize: 'small' | 'medium' | 'large' | 'extra-large';
    backgroundColor: string;
    textColor: string;
    outline: boolean;
  };
  audioDescriptions: boolean;
}

export interface AccessibilityCardProps {
  data: AccessibilitySettingsData;
  onChange: (
    field: keyof AccessibilitySettingsData | string,
    value: string | boolean | Record<string, unknown>
  ) => void;
  className?: string;
}

// Styled components
const CardTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.25rem',
  fontWeight: 600,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(1),
}));

const CardDescription = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(3),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.primary.main + '08', // 8% opacity
  borderRadius: '8px',
  borderLeft: `4px solid ${theme.palette.primary.main}`,
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1rem',
  fontWeight: 500,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(1.5),
  marginTop: theme.spacing(3),
}));

const FieldGroup = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2.5),
}));

const StyledDivider = styled(Divider)(({ theme }) => ({
  margin: theme.spacing(3, 0),
  backgroundColor: '#cac4d0', // Material outlineVariant color
}));

const AdvancedToggle = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

const ColorInputGroup = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: theme.spacing(2),
  marginTop: theme.spacing(1),
}));

export const AccessibilityCard: React.FC<AccessibilityCardProps> = ({
  data,
  onChange,
  className,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fontSizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
    { value: 'extra-large', label: 'Extra Large' },
  ];

  const focusIndicatorOptions = [
    { value: 'default', label: 'Default' },
    { value: 'high-contrast', label: 'High Contrast' },
    { value: 'custom', label: 'Custom' },
  ];

  const handleCustomColorChange = (
    colorType: keyof AccessibilitySettingsData['customColors'],
    value: string
  ) => {
    onChange('customColors', {
      ...data.customColors,
      [colorType]: value,
    });
  };

  const handleCaptionStyleChange = (
    styleType: keyof AccessibilitySettingsData['captionStyling'],
    value: string | boolean
  ) => {
    onChange('captionStyling', {
      ...data.captionStyling,
      [styleType]: value,
    });
  };

  return (
    <MaterialCard
      elevation="low"
      variant="elevated"
      rounded="lg"
      padding="lg"
      className={className}
    >
      <CardTitle variant="h2">Accessibility Settings</CardTitle>

      <CardDescription>
        <MaterialIcon name="info" size="small" color="primary" /> These settings enhance the
        extension for users with disabilities. Features include keyboard navigation, screen reader
        support, high contrast mode, and customizable styling.
      </CardDescription>

      {/* Basic Accessibility Settings */}
      <SectionTitle variant="h3">Navigation & Interaction</SectionTitle>

      <FieldGroup>
        <MaterialSwitch
          label="Enhanced Keyboard Navigation"
          checked={data.keyboardNavigationEnabled}
          onChange={(e) => onChange('keyboardNavigationEnabled', e.target.checked)}
          helperText="Enable advanced keyboard shortcuts and navigation features."
        />
      </FieldGroup>

      <FieldGroup>
        <MaterialSwitch
          label="Screen Reader Support"
          checked={data.screenReaderEnabled}
          onChange={(e) => onChange('screenReaderEnabled', e.target.checked)}
          helperText="Enable enhanced announcements and ARIA labels for screen readers."
        />
      </FieldGroup>

      <FieldGroup>
        <MaterialSelect
          label="Focus Indicator Style"
          value={data.focusIndicatorStyle}
          onChange={(e) => onChange('focusIndicatorStyle', e.target.value as string)}
          options={focusIndicatorOptions}
          helperText="Choose how focused elements are highlighted."
          fullWidth
        />
      </FieldGroup>

      <StyledDivider />

      {/* Visual Accessibility */}
      <SectionTitle variant="h3">Visual Accessibility</SectionTitle>

      <FieldGroup>
        <MaterialSwitch
          label="High Contrast Mode"
          checked={data.highContrastMode}
          onChange={(e) => onChange('highContrastMode', e.target.checked)}
          helperText="Enable high contrast colors for better visibility."
        />
      </FieldGroup>

      <FieldGroup>
        <MaterialSelect
          label="Font Size"
          value={data.fontSize}
          onChange={(e) => onChange('fontSize', e.target.value as string)}
          options={fontSizeOptions}
          helperText="Adjust text size throughout the interface."
          fullWidth
        />
      </FieldGroup>

      <FieldGroup>
        <MaterialSwitch
          label="Reduce Motion"
          checked={data.reducedMotion}
          onChange={(e) => onChange('reducedMotion', e.target.checked)}
          helperText="Minimize animations and transitions."
        />
      </FieldGroup>

      <FieldGroup>
        <MaterialSwitch
          label="Audio Descriptions"
          checked={data.audioDescriptions}
          onChange={(e) => onChange('audioDescriptions', e.target.checked)}
          helperText="Enable audio descriptions for visual content when available."
        />
      </FieldGroup>

      {/* Advanced Settings Toggle */}
      <AdvancedToggle>
        <MaterialButton
          variant="text"
          startIcon={
            <MaterialIcon name={showAdvanced ? 'expand_less' : 'expand_more'} size="small" />
          }
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </MaterialButton>
      </AdvancedToggle>

      {/* Advanced Settings (Collapsible) */}
      <Collapse in={showAdvanced}>
        <StyledDivider />

        <SectionTitle variant="h3">Custom Colors</SectionTitle>

        <ColorInputGroup>
          <MaterialInput
            label="Background Color"
            value={data.customColors.background}
            onChange={(e) => handleCustomColorChange('background', e.target.value)}
            type="color"
            helperText="Choose a custom background color."
          />

          <MaterialInput
            label="Text Color"
            value={data.customColors.foreground}
            onChange={(e) => handleCustomColorChange('foreground', e.target.value)}
            type="color"
            helperText="Choose a custom text color."
          />

          <MaterialInput
            label="Accent Color"
            value={data.customColors.accent}
            onChange={(e) => handleCustomColorChange('accent', e.target.value)}
            type="color"
            helperText="Choose a custom accent color for buttons and links."
          />

          <MaterialInput
            label="Border Color"
            value={data.customColors.border}
            onChange={(e) => handleCustomColorChange('border', e.target.value)}
            type="color"
            helperText="Choose a custom border color."
          />
        </ColorInputGroup>

        <StyledDivider />

        <SectionTitle variant="h3">Caption & Subtitle Styling</SectionTitle>

        <FieldGroup>
          <MaterialSelect
            label="Caption Font Size"
            value={data.captionStyling.fontSize}
            onChange={(e) => handleCaptionStyleChange('fontSize', e.target.value as string)}
            options={fontSizeOptions}
            helperText="Adjust subtitle and caption text size."
            fullWidth
          />
        </FieldGroup>

        <ColorInputGroup>
          <MaterialInput
            label="Caption Background"
            value={data.captionStyling.backgroundColor}
            onChange={(e) => handleCaptionStyleChange('backgroundColor', e.target.value)}
            type="color"
            helperText="Background color for subtitle text."
          />

          <MaterialInput
            label="Caption Text Color"
            value={data.captionStyling.textColor}
            onChange={(e) => handleCaptionStyleChange('textColor', e.target.value)}
            type="color"
            helperText="Text color for subtitles and captions."
          />
        </ColorInputGroup>

        <FieldGroup>
          <MaterialSwitch
            label="Caption Text Outline"
            checked={data.captionStyling.outline}
            onChange={(e) => handleCaptionStyleChange('outline', e.target.checked)}
            helperText="Add outline to caption text for better readability."
          />
        </FieldGroup>
      </Collapse>
    </MaterialCard>
  );
};

export default AccessibilityCard;
