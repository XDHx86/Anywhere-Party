/**
 * Material Design 3 Options Page Application
 * Main component that implements tabbed Material layout with all settings sections
 * Requirements: 26.1, 26.2, 26.5
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Container, Alert, Snackbar, Fade } from '@mui/material';
import { styled } from '@mui/material/styles';
import { MaterialTabs } from '../components/cards/MaterialTabs';
import { MaterialButton } from '../components/cards/MaterialButton';
import { MaterialFileInput } from '../components/cards/MaterialFileInput';
import { MaterialSelect } from '../components/cards/MaterialSelect';
import { MaterialIcon } from '../components/cards/MaterialIcon';
import { GeneralSettingsCard } from './components/GeneralSettingsCard';
import { AccessibilityCard } from './components/AccessibilityCard';
import { AppearanceCard } from './components/AppearanceCard';
import { AboutCard } from './components/AboutCard';
import { APIKeysCard } from './components/APIKeysCard';
import { SchedulingCard } from './components/SchedulingCard';
import { ImportPreviewModal, ConfigDiff } from './components/ImportPreviewModal';
import {
  SettingsService,
  SettingsData,
  ConfigFormat,
  AboutSettings,
  AccessibilitySettings,
} from './services/settings-service';
import {
  ValidationResult,
  createConfigDiff,
  validateConfig,
  sanitizeConfig,
} from './utils/validation';
import { useMaterialTheme } from '../theme';
import { ThemeMode } from '../theme/types';
import { useResponsiveDesign, useTouchOptimization } from '../hooks/useResponsiveDesign';
import { integrationService } from '../services/integration-service';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { getDiagnosticLogger } from '../utils/diagnostic-logger';
import { getLoadingStateManager } from '../utils/loading-state-manager';

// Responsive styled components
const OptionsContainer = styled(Container, {
  shouldForwardProp: (prop) => !['isMobile', 'isTablet'].includes(prop as string),
})<{ isMobile?: boolean; isTablet?: boolean }>(({ theme, isMobile, isTablet }) => ({
  maxWidth: isMobile ? '100%' : isTablet ? '768px' : '1200px',
  padding: isMobile ? theme.spacing(1) : isTablet ? theme.spacing(2) : theme.spacing(3),
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,

  // Mobile-specific adjustments
  ...(isMobile && {
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
  }),
}));

const HeaderSection = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isMobile',
})<{ isMobile?: boolean }>(({ theme, isMobile }) => ({
  marginBottom: isMobile ? theme.spacing(2) : theme.spacing(4),
  textAlign: 'center',

  '& h1': {
    fontSize: isMobile ? '1.5rem' : '2rem',
    margin: 0,
    fontWeight: 600,
  },

  '& p': {
    fontSize: isMobile ? '0.875rem' : '1rem',
    margin: '8px 0 0 0',
    color: theme.palette.text.secondary,
  },
}));

const TabsContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isMobile',
})<{ isMobile?: boolean }>(({ theme, isMobile }) => ({
  marginBottom: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  borderRadius: isMobile ? '8px' : '12px',
  boxShadow: theme.shadows[1],
  overflow: 'hidden',
}));

const TabContent = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isMobile',
})<{ isMobile?: boolean }>(({ theme, isMobile }) => ({
  padding: isMobile ? theme.spacing(2) : theme.spacing(3),
  minHeight: isMobile ? '400px' : '600px',
}));

const ActionsBar = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isMobile',
})<{ isMobile?: boolean }>(({ theme, isMobile }) => ({
  position: 'sticky',
  bottom: 0,
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  padding: isMobile ? theme.spacing(1.5) : theme.spacing(2, 3),
  display: 'flex',
  flexDirection: isMobile ? 'column' : 'row',
  gap: theme.spacing(2),
  justifyContent: 'space-between',
  alignItems: isMobile ? 'stretch' : 'center',
  borderRadius: isMobile ? '8px 8px 0 0' : '12px 12px 0 0',
  boxShadow: theme.shadows[4],
  zIndex: 1000,
}));

const ImportExportSection = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isMobile',
})<{ isMobile?: boolean }>(({ theme, isMobile }) => ({
  display: 'flex',
  gap: theme.spacing(1.5),
  alignItems: 'center',
  flexWrap: 'wrap',
  justifyContent: isMobile ? 'center' : 'flex-start',

  // Stack vertically on very small screens
  ...(isMobile && {
    flexDirection: 'column',
    alignItems: 'stretch',

    '& > *': {
      width: '100%',
    },
  }),
}));

const SaveSection = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isMobile',
})<{ isMobile?: boolean }>(({ theme, isMobile }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  alignItems: 'center',
  justifyContent: isMobile ? 'center' : 'flex-end',

  // Stack vertically on mobile
  ...(isMobile && {
    flexDirection: 'column',
    alignItems: 'stretch',

    '& > *': {
      width: '100%',
    },
  }),
}));

// Notification types
interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  autoHide?: boolean;
}

// Default settings used when loading fails or during import
const createDefaultSettings = (): SettingsData => ({
  general: {
    signalingServer: '',
    signalingWsPath: '/ws',
    localDevMode: false,
    roomDefaultPassword: '',
    syncTolerance: 300,
    syncTimeout: 5000,
    heartbeatInterval: 2000,
    reconnectInterval: 5000,
    roomStateTtl: 300000,
    videoDetectPoll: undefined,
  },
  apiKeys: {
    opensubtitles: '',
  },
  accessibility: {
    keyboardNavigationEnabled: true,
    screenReaderEnabled: false,
    highContrastMode: false,
    fontSize: 'medium',
    reducedMotion: false,
    focusIndicatorStyle: 'default',
    customColors: {
      background: '#ffffff',
      foreground: '#000000',
      accent: '#6200EE',
      border: '#cccccc',
    },
    captionStyling: {
      fontSize: 'medium',
      backgroundColor: '#000000',
      textColor: '#ffffff',
      outline: false,
    },
    audioDescriptions: false,
  },
  appearance: {
    themeMode: 'auto',
    accentColor: '#6200EE',
    customPrimaryColor: '#6200EE',
    customSecondaryColor: '#03DAC6',
    enableCustomColors: false,
    compactMode: false,
    animationsEnabled: true,
  },
  about: {
    version: '1.0.0',
    buildDate: new Date().toISOString(),
    changelogUrl: '#',
    repositoryUrl: '#',
    supportUrl: '#',
  },
});

// Map a flat imported config (CONFIG_SCHEMA keys) onto a SettingsData structure
const buildImportedSettings = (
  config: Record<string, unknown>,
  currentAbout?: AboutSettings
): SettingsData => {
  const defaults = createDefaultSettings();
  return {
    general: {
      signalingServer: (config.SIGNALING_SERVER as string) ?? defaults.general.signalingServer,
      signalingWsPath: (config.SIGNALING_WS_PATH as string) ?? defaults.general.signalingWsPath,
      localDevMode: (config.LOCAL_DEV_MODE as boolean) ?? defaults.general.localDevMode,
      roomDefaultPassword:
        (config.ROOM_DEFAULT_PASSWORD as string) ?? defaults.general.roomDefaultPassword,
      syncTolerance: (config.SYNC_TOLERANCE_MS as number) ?? defaults.general.syncTolerance,
      syncTimeout: (config.SYNC_TIMEOUT_MS as number) ?? defaults.general.syncTimeout,
      heartbeatInterval:
        (config.HEARTBEAT_INTERVAL_MS as number) ?? defaults.general.heartbeatInterval,
      reconnectInterval:
        (config.RECONNECT_INTERVAL_MS as number) ?? defaults.general.reconnectInterval,
      roomStateTtl: (config.ROOM_STATE_TTL_MS as number) ?? defaults.general.roomStateTtl,
      videoDetectPoll: config.VIDEO_DETECT_POLL_MS as number | undefined,
    },
    apiKeys: {
      opensubtitles: (config.OPENSUBTITLES_KEY as string) ?? defaults.apiKeys.opensubtitles,
    },
    accessibility: {
      ...defaults.accessibility,
      keyboardNavigationEnabled:
        (config.KEYBOARD_NAVIGATION_ENABLED as boolean) ??
        defaults.accessibility.keyboardNavigationEnabled,
      screenReaderEnabled:
        (config.SCREEN_READER_ENABLED as boolean) ?? defaults.accessibility.screenReaderEnabled,
      highContrastMode:
        (config.HIGH_CONTRAST_MODE as boolean) ?? defaults.accessibility.highContrastMode,
      reducedMotion: (config.REDUCED_MOTION as boolean) ?? defaults.accessibility.reducedMotion,
      fontSize: ((config.FONT_SIZE as string) ??
        defaults.accessibility.fontSize) as AccessibilitySettings['fontSize'],
      focusIndicatorStyle: ((config.FOCUS_INDICATOR_STYLE as string) ??
        defaults.accessibility.focusIndicatorStyle) as AccessibilitySettings['focusIndicatorStyle'],
    },
    appearance: defaults.appearance,
    about: currentAbout ?? defaults.about,
  };
};

export const OptionsApp: React.FC = () => {
  const { setTheme } = useMaterialTheme();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [exportFormat, setExportFormat] = useState<ConfigFormat>('json');
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importConfigDiff, setImportConfigDiff] = useState<ConfigDiff | null>(null);
  const [importValidation, setImportValidation] = useState<ValidationResult | null>(null);
  const [pendingImportData, setPendingImportData] = useState<SettingsData | null>(null);

  const settingsService = SettingsService.getInstance();

  // Enhanced error handling and loading with fallback
  const diagnosticLogger = React.useMemo(() => {
    try {
      return getDiagnosticLogger();
    } catch (error) {
      console.warn('Failed to initialize diagnostic logger:', error);
      // Return a minimal fallback logger
      return {
        startComponentLoad: () => 'fallback-load-id',
        endComponentLoad: () => {},
        logComponentError: (component: string, error: Error) => {
          console.error(`Component Error [${component}]:`, error);
        },
        logBrowserInfo: () => {
          console.log('Browser info logging not available');
        },
      };
    }
  }, []);

  const loadingManager = React.useMemo(() => {
    try {
      return getLoadingStateManager();
    } catch (error) {
      console.warn('Failed to initialize loading manager:', error);
      // Return a minimal fallback manager
      return {
        setOperationLoading: () => {},
        updateOperationProgress: () => {},
      };
    }
  }, []);

  // Responsive design hooks
  const responsive = useResponsiveDesign();
  const { getTouchTargetSize } = useTouchOptimization();

  // Tab configuration
  const tabs = [
    {
      id: 'general',
      label: 'General',
      icon: <MaterialIcon name="settings" size="small" />,
    },
    {
      id: 'api-keys',
      label: 'API Keys',
      icon: <MaterialIcon name="key" size="small" />,
    },
    {
      id: 'accessibility',
      label: 'Accessibility',
      icon: <MaterialIcon name="accessibility" size="small" />,
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: <MaterialIcon name="palette" size="small" />,
    },
    {
      id: 'scheduling',
      label: 'Scheduling',
      icon: <MaterialIcon name="schedule" size="small" />,
    },
    {
      id: 'about',
      label: 'About',
      icon: <MaterialIcon name="info" size="small" />,
    },
  ];

  const formatOptions = [
    { value: 'json', label: 'JSON' },
    { value: 'env', label: 'Environment Variables' },
    { value: 'ini', label: 'INI File' },
  ];

  // Enhanced error handler for components
  const handleComponentError = useCallback(
    (error: Error, _errorInfo: React.ErrorInfo) => {
      diagnosticLogger.logComponentError('OptionsApp', error);
      showNotification('A component failed to load. Please try refreshing.', 'error');
    },
    [diagnosticLogger]
  );

  // Enhanced loading with timeout handling
  const handleLoadingTimeout = useCallback((operation: string, duration: number) => {
    console.warn(`Loading timeout for ${operation} after ${duration}ms`);
    showNotification(
      `Loading is taking longer than expected. Please check your connection.`,
      'warning'
    );
  }, []);

  // Load settings and connect to integration service on mount with enhanced error handling
  useEffect(() => {
    const initialize = async () => {
      const loadId = diagnosticLogger.startComponentLoad('options-initialization');

      try {
        loadingManager.setOperationLoading('options-initialization', true);

        // Update progress
        loadingManager.updateOperationProgress(
          'options-initialization',
          10,
          'connecting',
          'Connecting to extension...'
        );

        // Check if browser APIs are available
        if (typeof chrome === 'undefined' && typeof browser === 'undefined') {
          console.warn('Browser extension APIs not available, using fallback mode');
          showNotification(
            'Extension APIs not available - some features may be limited',
            'warning'
          );
        }

        // Connect to integration service with timeout
        let connected = false;
        try {
          const connectPromise = integrationService.connectOptionsPage();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 8000)
          );

          connected = (await Promise.race([connectPromise, timeoutPromise])) as boolean;
        } catch (connectError) {
          console.warn('Integration service connection failed:', connectError);
          connected = false;
        }

        if (!connected) {
          showNotification('Some features may not work properly', 'warning');
        }

        loadingManager.updateOperationProgress(
          'options-initialization',
          50,
          'loading-settings',
          'Loading settings...'
        );

        // Load settings with fallback
        try {
          await loadSettings();
        } catch (settingsError) {
          console.error('Failed to load settings:', settingsError);
          showNotification('Failed to load settings - using defaults', 'error');

          // Set default settings if loading fails
          setSettings(createDefaultSettings());
        }

        loadingManager.updateOperationProgress(
          'options-initialization',
          90,
          'finalizing',
          'Finalizing setup...'
        );

        // Log browser info for diagnostics
        try {
          diagnosticLogger.logBrowserInfo();
        } catch (logError) {
          console.warn('Failed to log browser info:', logError);
        }

        loadingManager.updateOperationProgress('options-initialization', 100, 'complete', 'Ready');
        diagnosticLogger.endComponentLoad(loadId, 'options-initialization', true);
      } catch (error) {
        console.error('Failed to initialize options page:', error);
        diagnosticLogger.endComponentLoad(
          loadId,
          'options-initialization',
          false,
          error instanceof Error ? error.message : String(error)
        );
        diagnosticLogger.logComponentError(
          'OptionsApp-Initialization',
          error instanceof Error ? error : new Error(String(error))
        );

        showNotification('Failed to initialize options page - using fallback mode', 'error');

        // Set loading to false and provide default settings
        setLoading(false);
        setSettings(createDefaultSettings());
      } finally {
        loadingManager.setOperationLoading('options-initialization', false);
      }
    };

    // Add a small delay to ensure all dependencies are loaded
    const initTimer = setTimeout(() => {
      initialize();
    }, 200);

    return () => clearTimeout(initTimer);
  }, [diagnosticLogger, loadingManager]);

  const loadSettings = async () => {
    try {
      setLoading(true);

      // Add timeout protection for settings loading
      const loadPromise = settingsService.loadSettings();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Settings loading timeout')), 10000)
      );

      const data = await Promise.race([loadPromise, timeoutPromise]);
      setSettings(data);
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to load settings:', error);
      showNotification('Failed to load settings. Using defaults.', 'error');

      // Set comprehensive default settings to prevent UI from being completely broken
      setSettings(createDefaultSettings());
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string, type: Notification['type'], autoHide = true) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const notification: Notification = { id, message, type, autoHide };
    setNotifications((prev) => [...prev, notification]);

    if (autoHide) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 5000);
    }
  };

  const handleSettingsChange = useCallback(
    (
      section: keyof SettingsData,
      field: string,
      value: string | number | boolean | Record<string, unknown>
    ) => {
      if (!settings) return;

      setSettings((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: value,
          },
        };
      });

      setIsDirty(true);
    },
    [settings]
  );

  const handleSave = async () => {
    if (!settings || !isDirty) return;

    try {
      setSaving(true);
      const result = await settingsService.saveSettings(settings);

      if (result.success) {
        setIsDirty(false);
        showNotification('Settings saved successfully', 'success');

        // Show warnings if any
        if (result.validation?.warnings.length) {
          const warningMessage = `Saved with warnings: ${result.validation.warnings.map((w) => w.message).join(', ')}`;
          showNotification(warningMessage, 'warning');
        }
      } else {
        showNotification(result.error || 'Failed to save settings', 'error');

        // Show validation errors
        if (result.validation?.errors.length) {
          result.validation.errors.forEach((error) => {
            showNotification(`${error.field}: ${error.message}`, 'error');
          });
        }
      }
    } catch {
      showNotification('Error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')
    ) {
      return;
    }

    try {
      const result = await settingsService.resetSettings();

      if (result.success) {
        await loadSettings();
        showNotification('Settings reset to defaults', 'success');
      } else {
        showNotification(result.error || 'Failed to reset settings', 'error');
      }
    } catch {
      showNotification('Error resetting settings', 'error');
    }
  };

  const handleExport = async () => {
    try {
      const result = await settingsService.exportSettings(exportFormat);

      if (result.success && result.data) {
        settingsService.downloadSettings(result.data, exportFormat);
        showNotification('Settings exported successfully', 'success');
      } else {
        showNotification(result.error || 'Failed to export settings', 'error');
      }
    } catch {
      showNotification('Error exporting settings', 'error');
    }
  };

  const handleImport = async (content: string, file: File) => {
    try {
      // Detect format from file extension
      const extension = file.name.split('.').pop()?.toLowerCase();
      let format: ConfigFormat = exportFormat;

      if (extension === 'json') format = 'json';
      else if (extension === 'env') format = 'env';
      else if (extension === 'ini') format = 'ini';

      // Parse and validate the imported configuration
      let importedConfig: Record<string, unknown>;

      try {
        if (format === 'json') {
          importedConfig = JSON.parse(content);
        } else {
          // For now, only support JSON format for preview
          showNotification(
            'Preview is only supported for JSON format. Import will proceed without preview.',
            'warning'
          );

          const result = await settingsService.importSettings(content, format);

          if (result.success && result.data) {
            setSettings(result.data);
            setIsDirty(false);
            showNotification('Settings imported successfully', 'success');
          } else {
            showNotification(result.error || 'Failed to import settings', 'error');
          }
          return;
        }
      } catch {
        showNotification('Invalid configuration format', 'error');
        return;
      }

      // Sanitize the configuration
      const sanitized = sanitizeConfig(importedConfig);

      // Validate the configuration
      const validation = validateConfig(sanitized);

      // Create diff with current settings
      const currentConfig = settings
        ? {
            ...settings.general,
            ...settings.apiKeys,
            ...settings.accessibility,
            ...settings.appearance,
          }
        : {};

      const diff = createConfigDiff(currentConfig, sanitized);

      // Show preview modal
      setImportConfigDiff(diff);
      setImportValidation(validation);
      setPendingImportData(buildImportedSettings(sanitized, settings?.about));
      setImportPreviewOpen(true);
    } catch (error) {
      console.error('Import error:', error);
      showNotification('Error importing settings', 'error');
    }
  };

  const handleImportConfirm = async () => {
    if (!pendingImportData) return;

    try {
      setImportPreviewOpen(false);

      // Apply the imported settings
      setSettings(pendingImportData);
      setIsDirty(false);

      showNotification('Settings imported successfully', 'success');

      // Show validation warnings if any
      if (importValidation?.warnings.length) {
        const warningMessage = `Imported with warnings: ${importValidation.warnings.map((w) => w.message).join(', ')}`;
        showNotification(warningMessage, 'warning');
      }
    } catch {
      showNotification('Error applying imported settings', 'error');
    } finally {
      // Clear pending data
      setPendingImportData(null);
      setImportConfigDiff(null);
      setImportValidation(null);
    }
  };

  const handleImportCancel = () => {
    setImportPreviewOpen(false);
    setPendingImportData(null);
    setImportConfigDiff(null);
    setImportValidation(null);
  };

  const handleThemePreview = (mode: ThemeMode) => {
    setTheme(mode);
  };

  const renderTabContent = () => {
    if (!settings) return null;

    switch (activeTab) {
      case 'general':
        return (
          <GeneralSettingsCard
            data={settings.general}
            onChange={(field, value) => handleSettingsChange('general', field, value)}
          />
        );

      case 'api-keys':
        return (
          <APIKeysCard
            data={settings.apiKeys}
            onChange={(field, value) => handleSettingsChange('apiKeys', field, value)}
          />
        );

      case 'accessibility':
        return (
          <AccessibilityCard
            data={settings.accessibility}
            onChange={(field, value) => handleSettingsChange('accessibility', field, value)}
          />
        );

      case 'appearance':
        return (
          <AppearanceCard
            data={settings.appearance}
            onChange={(field, value) => handleSettingsChange('appearance', field, value)}
            onThemePreview={handleThemePreview}
          />
        );

      case 'scheduling':
        return (
          <SchedulingCard
            onNotification={(message, severity) => {
              const id = Date.now().toString();
              setNotifications((prev) => [
                ...prev,
                { id, message, type: severity, autoHide: true },
              ]);
            }}
          />
        );

      case 'about':
        return (
          <AboutCard
            version={settings.about.version}
            buildDate={settings.about.buildDate}
            changelogUrl={settings.about.changelogUrl}
            repositoryUrl={settings.about.repositoryUrl}
            supportUrl={settings.about.supportUrl}
          />
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <OptionsContainer>
        <LoadingIndicator
          size="large"
          variant="circular"
          showProgress={true}
          showTimeRemaining={true}
          showOperation={true}
          message="Loading Options..."
          minHeight="400px"
          onTimeout={handleLoadingTimeout}
          onRetry={() => window.location.reload()}
        />
      </OptionsContainer>
    );
  }

  return (
    <OptionsContainer isMobile={responsive.isMobile} isTablet={responsive.isTablet}>
      <HeaderSection isMobile={responsive.isMobile}>
        <MaterialIcon name="settings" size={responsive.isMobile ? 36 : 48} color="primary" />
        <Box sx={{ mt: responsive.isMobile ? 1 : 2 }}>
          <h1>Watch Party Settings</h1>
          <p>Configure your watch party extension preferences</p>
        </Box>
      </HeaderSection>

      <TabsContainer isMobile={responsive.isMobile}>
        <MaterialTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <TabContent isMobile={responsive.isMobile}>
          <ErrorBoundary
            componentName={`OptionsTab-${activeTab}`}
            onError={handleComponentError}
            maxRetries={2}
            enableDiagnostics={true}
            enableErrorReporting={true}
          >
            <Fade in={true} key={activeTab}>
              <div>{renderTabContent()}</div>
            </Fade>
          </ErrorBoundary>
        </TabContent>
      </TabsContainer>

      <ActionsBar isMobile={responsive.isMobile}>
        <ImportExportSection isMobile={responsive.isMobile}>
          <MaterialSelect
            options={formatOptions}
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as ConfigFormat)}
            size={responsive.isMobile ? 'medium' : 'small'}
            label="Format"
            fullWidth={responsive.isMobile}
          />

          <MaterialButton
            variant="outlined"
            size={responsive.isMobile ? 'medium' : 'small'}
            onClick={handleExport}
            startIcon={<MaterialIcon name="download" size="small" />}
            style={{
              minHeight: getTouchTargetSize(44),
              width: responsive.isMobile ? '100%' : 'auto',
            }}
          >
            Export
          </MaterialButton>

          <MaterialFileInput
            accept=".json,.env,.ini,.txt"
            onFileContent={handleImport}
            helperText="Import settings file"
          />
        </ImportExportSection>

        <SaveSection isMobile={responsive.isMobile}>
          <MaterialButton
            variant="outlined"
            color="error"
            onClick={handleReset}
            startIcon={<MaterialIcon name="restore" size="small" />}
            size={responsive.isMobile ? 'medium' : 'small'}
            style={{
              minHeight: getTouchTargetSize(44),
              width: responsive.isMobile ? '100%' : 'auto',
            }}
          >
            Reset
          </MaterialButton>

          <MaterialButton
            variant="filled"
            onClick={handleSave}
            loading={saving}
            disabled={!isDirty}
            startIcon={<MaterialIcon name="save" size="small" />}
            size={responsive.isMobile ? 'medium' : 'small'}
            style={{
              minHeight: getTouchTargetSize(44),
              width: responsive.isMobile ? '100%' : 'auto',
            }}
          >
            Save Changes
          </MaterialButton>
        </SaveSection>
      </ActionsBar>

      {/* Import Preview Modal */}
      <ImportPreviewModal
        open={importPreviewOpen}
        configDiff={importConfigDiff}
        validationResult={importValidation}
        onConfirm={handleImportConfirm}
        onCancel={handleImportCancel}
        loading={saving}
      />

      {/* Notifications */}
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.autoHide ? 5000 : null}
          anchorOrigin={{
            vertical: responsive.isMobile ? 'bottom' : 'top',
            horizontal: responsive.isMobile ? 'center' : 'right',
          }}
        >
          <Alert
            severity={notification.type}
            onClose={() => setNotifications((prev) => prev.filter((n) => n.id !== notification.id))}
            sx={{
              borderRadius: '8px',
              fontSize: responsive.isMobile ? '0.875rem' : '1rem',
              minHeight: getTouchTargetSize(44),
            }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </OptionsContainer>
  );
};

export default OptionsApp;
