/**
 * Appearance Settings Card Component
 * Implements Material Design 3 card for theme and appearance settings
 * Requirements: 26.2, 26.3, 26.4
 */

import React from 'react';
import { MaterialCard } from '../../components/cards/MaterialCard';
import { MaterialInput } from '../../components/cards/MaterialInput';
import { MaterialSwitch } from '../../components/cards/MaterialSwitch';
import { MaterialSelect } from '../../components/cards/MaterialSelect';
import { MaterialButton } from '../../components/cards/MaterialButton';
import { Typography, Box, Divider } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useMaterialTheme } from '../../theme';
import { MaterialIcon } from '../../components/cards/MaterialIcon';
import { ThemeMode } from '../../theme/types';

export interface AppearanceSettingsData {
  themeMode: ThemeMode;
  accentColor: string;
  customPrimaryColor: string;
  customSecondaryColor: string;
  enableCustomColors: boolean;
  compactMode: boolean;
  animationsEnabled: boolean;
}

export interface AppearanceCardProps {
  data: AppearanceSettingsData;
  onChange: (field: keyof AppearanceSettingsData, value: any) => void;
  onThemePreview?: (mode: ThemeMode) => void;
  className?: string;
}

// Styled components
const CardTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.25rem',
  fontWeight: 600,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(2),
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
  backgroundColor: theme.palette.divider,
}));

const ThemePreviewContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

const ThemePreviewCard = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isActive' && prop !== 'themeType',
})<{ isActive: boolean; themeType: 'light' | 'dark' | 'auto' }>(
  ({ theme, isActive, themeType }) => ({
    flex: 1,
    padding: theme.spacing(2),
    borderRadius: '12px',
    border: `2px solid ${isActive ? theme.palette.primary.main : theme.palette.divider}`,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center',

    ...(themeType === 'light' && {
      backgroundColor: '#ffffff',
      color: '#000000',
    }),

    ...(themeType === 'dark' && {
      backgroundColor: '#121212',
      color: '#ffffff',
    }),

    ...(themeType === 'auto' && {
      background: 'linear-gradient(90deg, #ffffff 50%, #121212 50%)',
      color: theme.palette.text.primary,
    }),

    '&:hover': {
      borderColor: theme.palette.primary.main,
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[4],
    },
  })
);

const ColorPickerGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
}));

const ColorPreview = styled(Box)(({ theme }) => ({
  width: '40px',
  height: '40px',
  borderRadius: '8px',
  border: `2px solid ${theme.palette.divider}`,
  marginRight: theme.spacing(2),
  flexShrink: 0,
}));

const ColorInputContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

const PresetColorsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  marginTop: theme.spacing(1),
  flexWrap: 'wrap',
}));

const PresetColorButton = styled('button')<{ color: string; isSelected: boolean }>(
  ({ theme, color, isSelected }) => ({
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: color,
    border: `2px solid ${isSelected ? theme.palette.primary.main : theme.palette.divider}`,
    cursor: 'pointer',
    transition: 'all 0.2s ease',

    '&:hover': {
      transform: 'scale(1.1)',
      boxShadow: theme.shadows[2],
    },
  })
);

export const AppearanceCard: React.FC<AppearanceCardProps> = ({
  data,
  onChange,
  onThemePreview,
  className,
}) => {
  const { theme, mode, setTheme, updateThemeSettings, themeSettings } = useMaterialTheme();

  const themeModeOptions = [
    { value: 'light', label: 'Light Theme' },
    { value: 'dark', label: 'Dark Theme' },
    { value: 'auto', label: 'System Default' },
  ];

  const presetColors = [
    '#6200EE', // Material Purple (Default)
    '#03DAC6', // Material Teal
    '#FF5722', // Material Deep Orange
    '#4CAF50', // Material Green
    '#2196F3', // Material Blue
    '#FF9800', // Material Orange
    '#9C27B0', // Material Purple
    '#F44336', // Material Red
  ];

  const handleThemeChange = async (newMode: ThemeMode) => {
    onChange('themeMode', newMode);
    onThemePreview?.(newMode);

    // Update theme context
    if (setTheme) {
      await setTheme(newMode);
    }
  };

  const handlePresetColorSelect = async (color: string) => {
    onChange('accentColor', color);
    onChange('customPrimaryColor', color);

    // Update theme context
    if (updateThemeSettings) {
      await updateThemeSettings({
        customPrimaryColor: color,
        // accentColor: color, // TODO: Add accent color support to theme
      });
    }
  };

  const handleCustomColorChange = async (field: keyof AppearanceSettingsData, value: any) => {
    onChange(field, value);

    // Update theme context for color-related changes
    if (
      updateThemeSettings &&
      (field === 'customPrimaryColor' ||
        field === 'customSecondaryColor' ||
        field === 'enableCustomColors')
    ) {
      await updateThemeSettings({
        [field]: value,
      });
    }
  };

  const handleInterfaceOptionChange = async (field: keyof AppearanceSettingsData, value: any) => {
    onChange(field, value);

    // Update theme context for interface options
    if (updateThemeSettings && (field === 'compactMode' || field === 'animationsEnabled')) {
      await updateThemeSettings({
        [field]: value,
      });
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
      <CardTitle variant="h2">Appearance Settings</CardTitle>

      {/* Theme Selection */}
      <SectionTitle variant="h3">Theme Mode</SectionTitle>

      <ThemePreviewContainer>
        <ThemePreviewCard
          isActive={mode === 'light'}
          themeType="light"
          onClick={() => handleThemeChange('light')}
        >
          <MaterialIcon name="light_mode" size="large" />
          <Typography variant="body2" sx={{ mt: 1, color: 'inherit' }}>
            Light
          </Typography>
        </ThemePreviewCard>

        <ThemePreviewCard
          isActive={mode === 'dark'}
          themeType="dark"
          onClick={() => handleThemeChange('dark')}
        >
          <MaterialIcon name="dark_mode" size="large" />
          <Typography variant="body2" sx={{ mt: 1, color: 'inherit' }}>
            Dark
          </Typography>
        </ThemePreviewCard>

        <ThemePreviewCard
          isActive={mode === 'auto'}
          themeType="auto"
          onClick={() => handleThemeChange('auto')}
        >
          <MaterialIcon name="brightness_auto" size="large" />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Auto
          </Typography>
        </ThemePreviewCard>
      </ThemePreviewContainer>

      <FieldGroup>
        <MaterialSelect
          label="Theme Mode"
          value={mode}
          onChange={(e) => handleThemeChange(e.target.value as ThemeMode)}
          options={themeModeOptions}
          helperText="Choose between light, dark, or system default theme."
          fullWidth
        />
      </FieldGroup>

      <StyledDivider />

      {/* Color Customization */}
      <SectionTitle variant="h3">Color Customization</SectionTitle>

      <FieldGroup>
        <MaterialSwitch
          label="Enable Custom Colors"
          checked={data.enableCustomColors}
          onChange={(e) => handleCustomColorChange('enableCustomColors', e.target.checked)}
          helperText="Allow customization of theme colors beyond presets."
        />
      </FieldGroup>

      <FieldGroup>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Accent Color Presets
        </Typography>
        <PresetColorsContainer>
          {presetColors.map((color) => (
            <PresetColorButton
              key={color}
              color={color}
              isSelected={data.accentColor === color}
              onClick={() => handlePresetColorSelect(color)}
              title={`Select ${color} as accent color`}
            />
          ))}
        </PresetColorsContainer>
      </FieldGroup>

      {data.enableCustomColors && (
        <ColorPickerGrid>
          <ColorInputContainer>
            <ColorPreview sx={{ backgroundColor: data.customPrimaryColor }} />
            <MaterialInput
              label="Primary Color"
              value={data.customPrimaryColor}
              onChange={(e) => handleCustomColorChange('customPrimaryColor', e.target.value)}
              type="color"
              helperText="Main brand color for buttons and highlights."
              fullWidth
            />
          </ColorInputContainer>

          <ColorInputContainer>
            <ColorPreview sx={{ backgroundColor: data.customSecondaryColor }} />
            <MaterialInput
              label="Secondary Color"
              value={data.customSecondaryColor}
              onChange={(e) => handleCustomColorChange('customSecondaryColor', e.target.value)}
              type="color"
              helperText="Complementary color for accents and highlights."
              fullWidth
            />
          </ColorInputContainer>
        </ColorPickerGrid>
      )}

      <StyledDivider />

      {/* Interface Options */}
      <SectionTitle variant="h3">Interface Options</SectionTitle>

      <FieldGroup>
        <MaterialSwitch
          label="Compact Mode"
          checked={data.compactMode}
          onChange={(e) => handleInterfaceOptionChange('compactMode', e.target.checked)}
          helperText="Reduce spacing and padding for a more compact interface."
        />
      </FieldGroup>

      <FieldGroup>
        <MaterialSwitch
          label="Enable Animations"
          checked={data.animationsEnabled}
          onChange={(e) => handleInterfaceOptionChange('animationsEnabled', e.target.checked)}
          helperText="Enable smooth transitions and animations throughout the interface."
        />
      </FieldGroup>

      <StyledDivider />

      {/* Reset Options */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <MaterialButton
          variant="outlined"
          onClick={() => {
            onChange('themeMode', 'auto');
            onChange('accentColor', '#6200EE');
            onChange('customPrimaryColor', '#6200EE');
            onChange('customSecondaryColor', '#03DAC6');
            onChange('enableCustomColors', false);
            onChange('compactMode', false);
            onChange('animationsEnabled', true);
          }}
        >
          Reset to Defaults
        </MaterialButton>
      </Box>
    </MaterialCard>
  );
};

export default AppearanceCard;
