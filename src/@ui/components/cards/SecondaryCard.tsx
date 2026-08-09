/**
 * Secondary Card Component
 * Collapsible settings section with smooth animations
 * Requirements: 25.2, 25.3
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Collapse, IconButton, Switch, Divider } from '@mui/material';
import { styled } from '@mui/material/styles';
import { MaterialCard } from './MaterialCard';
import { MaterialButton } from './MaterialButton';
import { MaterialIcon } from './MaterialIcon';
import { browserAPI } from '../../utils/browser-api';
import { useMaterialTheme } from '../../theme/theme-provider';

// Types
export interface SecondaryCardProps {
  collapsed: boolean;
  onToggle: () => void;
  onNotification: (notification: {
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  }) => void;
  className?: string;
  'data-testid'?: string;
}

interface SettingsState {
  darkMode: boolean;
  notifications: boolean;
  autoJoin: boolean;
  highContrast: boolean;
}

// Styled components
const SecondaryContainer = styled(Box)(({ theme: _theme }) => ({
  display: 'flex',
  flexDirection: 'column',
}));

const HeaderContainer = styled(Box)(({ theme: _theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'pointer',
  padding: _theme.spacing(1, 0),
  borderRadius: '8px',
  transition: _theme.transitions.create(['background-color'], {
    duration: _theme.transitions.duration.short,
  }),
  '&:hover': {
    backgroundColor: _theme.palette.action.hover,
  },
}));

const ContentContainer = styled(Box)(({ theme: _theme }) => ({
  paddingTop: _theme.spacing(2),
}));

const SettingsSection = styled(Box)(({ theme: _theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: _theme.spacing(2),
}));

const SettingRow = styled(Box)(({ theme: _theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: _theme.spacing(1, 0),
}));

const QuickActionsGrid = styled(Box)(({ theme: _theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: _theme.spacing(1.5),
  marginTop: _theme.spacing(2),
}));

const ExpandIcon = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== 'expanded',
})<{ expanded: boolean }>(({ theme: _theme, expanded }) => ({
  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
  transition: _theme.transitions.create('transform', {
    duration: _theme.transitions.duration.short,
  }),
  padding: _theme.spacing(0.5),
}));

// Secondary Card Component
export const SecondaryCard: React.FC<SecondaryCardProps> = ({
  collapsed,
  onToggle,
  onNotification,
  className,
  'data-testid': testId,
}) => {
  const { theme } = useMaterialTheme();

  const [settings, setSettings] = useState<SettingsState>({
    darkMode: false,
    notifications: true,
    autoJoin: false,
    highContrast: false,
  });

  // Load settings from storage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (browserAPI?.storage?.local) {
          const result = await browserAPI.storage.local.get(['popupSettings']);
          // Check if result exists and has the expected structure
          if (result && typeof result === 'object' && result.popupSettings) {
            setSettings((prev) => ({
              ...prev,
              ...(result.popupSettings as Partial<SettingsState>),
            }));
          }
        }
      } catch (_error) {
        console.warn('Failed to load settings, using defaults:', _error);
      }
    };

    loadSettings();
  }, []);

  // Save settings to storage
  const saveSettings = async (newSettings: Partial<SettingsState>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);

      if (browserAPI?.storage?.local) {
        await browserAPI.storage.local.set({ popupSettings: updatedSettings });
      }

      onNotification({
        type: 'success',
        message: 'Settings saved successfully',
      });
    } catch (_error) {
      console.error('Failed to save settings:', _error);
      onNotification({
        type: 'error',
        message: 'Failed to save settings',
      });
    }
  };

  const handleSettingChange = (key: keyof SettingsState, value: boolean) => {
    saveSettings({ [key]: value });
  };

  const handleOpenOptions = () => {
    browserAPI.runtime.openOptionsPage();
  };

  const handleExportSettings = async () => {
    try {
      const result = await browserAPI.storage.local.get(null);

      const dataStr = JSON.stringify(result, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'watch-party-settings.json';
      link.click();

      URL.revokeObjectURL(url);

      onNotification({
        type: 'success',
        message: 'Settings exported successfully',
      });
    } catch {
      onNotification({
        type: 'error',
        message: 'Failed to export settings',
      });
    }
  };

  const handleResetSettings = async () => {
    try {
      const defaultSettings: SettingsState = {
        darkMode: false,
        notifications: true,
        autoJoin: false,
        highContrast: false,
      };

      await saveSettings(defaultSettings);

      onNotification({
        type: 'success',
        message: 'Settings reset to defaults',
      });
    } catch {
      onNotification({
        type: 'error',
        message: 'Failed to reset settings',
      });
    }
  };

  return (
    <MaterialCard
      elevation="low"
      variant="filled"
      padding="lg"
      className={className}
      data-testid={testId}
    >
      <SecondaryContainer>
        <HeaderContainer onClick={onToggle}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 500,
              color: theme.palette.onSurface,
            }}
          >
            Settings & Preferences
          </Typography>
          <ExpandIcon expanded={!collapsed} size="small">
            <MaterialIcon name="chevron-down" size="small" />
          </ExpandIcon>
        </HeaderContainer>

        <Collapse in={!collapsed} timeout="auto" unmountOnExit>
          <ContentContainer>
            <SettingsSection>
              {/* Quick Settings */}
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Quick Settings
              </Typography>

              <SettingRow>
                <Typography variant="body2">Dark Mode</Typography>
                <Switch
                  checked={settings.darkMode}
                  onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                  size="small"
                />
              </SettingRow>

              <SettingRow>
                <Typography variant="body2">Notifications</Typography>
                <Switch
                  checked={settings.notifications}
                  onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                  size="small"
                />
              </SettingRow>

              <SettingRow>
                <Typography variant="body2">Auto-join last room</Typography>
                <Switch
                  checked={settings.autoJoin}
                  onChange={(e) => handleSettingChange('autoJoin', e.target.checked)}
                  size="small"
                />
              </SettingRow>

              <Divider sx={{ my: 1 }} />

              {/* Accessibility */}
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Accessibility
              </Typography>

              <SettingRow>
                <Typography variant="body2">High Contrast</Typography>
                <Switch
                  checked={settings.highContrast}
                  onChange={(e) => handleSettingChange('highContrast', e.target.checked)}
                  size="small"
                />
              </SettingRow>

              <Divider sx={{ my: 1 }} />

              {/* Quick Actions */}
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Quick Actions
              </Typography>

              <QuickActionsGrid>
                <MaterialButton
                  variant="outlined"
                  size="small"
                  fullWidth
                  startIcon={<MaterialIcon name="settings" size="small" />}
                  onClick={handleOpenOptions}
                >
                  Full Settings
                </MaterialButton>

                <MaterialButton
                  variant="outlined"
                  size="small"
                  fullWidth
                  startIcon={<MaterialIcon name="download" size="small" />}
                  onClick={handleExportSettings}
                >
                  Export
                </MaterialButton>

                <MaterialButton
                  variant="text"
                  size="small"
                  fullWidth
                  startIcon={<MaterialIcon name="refresh-cw" size="small" />}
                  onClick={handleResetSettings}
                >
                  Reset
                </MaterialButton>

                <MaterialButton
                  variant="text"
                  size="small"
                  fullWidth
                  startIcon={<MaterialIcon name="help-circle" size="small" />}
                  onClick={() =>
                    window.open('https://github.com/your-repo/watch-party-extension/wiki', '_blank')
                  }
                >
                  Help
                </MaterialButton>
              </QuickActionsGrid>
            </SettingsSection>
          </ContentContainer>
        </Collapse>
      </SecondaryContainer>
    </MaterialCard>
  );
};

export default SecondaryCard;
