/**
 * Unified browser extension API types
 */

export interface StorageArea {
  get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  clear(): Promise<void>;
}

export interface RuntimeAPI {
  sendMessage(message: unknown): Promise<unknown>;
  sendMessage(extensionId: string, message: unknown): Promise<unknown>;
  onMessage: {
    // NOTE: `any` for `message` matches the standard @types/chrome signatures.
    // The chrome runtime delivers untyped payloads; narrowing is done in each handler.
    addListener(
      callback: (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped runtime boundary, matches @types/chrome
        message: any,
        sender: chrome.runtime.MessageSender | undefined,
        sendResponse: (response?: unknown) => void
      ) => void | boolean | Promise<unknown>
    ): void;
    removeListener(callback: (...args: unknown[]) => void): void;
  };
  getManifest(): chrome.runtime.Manifest | Record<string, unknown>;
  id: string;
}

export interface TabsAPI {
  query(queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]>;
  sendMessage(tabId: number, message: unknown): Promise<unknown>;
  onUpdated: {
    addListener(
      callback: (tabId: number, changeInfo: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab) => void
    ): void;
    removeListener(callback: (...args: unknown[]) => void): void;
  };
}

export interface PermissionsAPI {
  request(permissions: chrome.permissions.Permissions): Promise<boolean>;
  contains(permissions: chrome.permissions.Permissions): Promise<boolean>;
  remove(permissions: chrome.permissions.Permissions): Promise<boolean>;
}

export interface AlarmsAPI {
  create(
    name: string,
    alarmInfo: { when?: number; delayInMinutes?: number; periodInMinutes?: number }
  ): void;
  clear(name: string): Promise<boolean>;
  clearAll(): Promise<boolean>;
  onAlarm: {
    addListener(
      callback: (alarm: { name: string; scheduledTime: number; periodInMinutes?: number }) => void
    ): void;
    removeListener(callback: (...args: unknown[]) => void): void;
  };
}

export interface NotificationsAPI {
  create(
    id: string,
    options: {
      type?: string;
      title?: string;
      message?: string;
      iconUrl?: string;
      priority?: number;
      buttons?: Array<{ title: string; iconUrl?: string }>;
    }
  ): Promise<string>;
  clear(id: string): Promise<boolean>;
  clearAll(): Promise<boolean>;
  onClicked: {
    addListener(callback: (notificationId: string) => void): void;
    removeListener(callback: (...args: unknown[]) => void): void;
  };
}

export interface BrowserBridge {
  storage: {
    local: StorageArea;
    sync: StorageArea;
  };
  runtime: RuntimeAPI;
  tabs: TabsAPI;
  permissions: PermissionsAPI;
  alarms: AlarmsAPI;
  notifications: NotificationsAPI;
  isChrome: boolean;
  isFirefox: boolean;
  manifestVersion: number;
}

export interface ExtensionConfig {
  SIGNALING_SERVER: string;
  SIGNALING_WS_PATH: string;
  STUN_SERVERS: string[];
  TURN_SERVERS: TurnServer[];
  OPENSUBTITLES_KEY: string;
  DEFAULT_SUBTITLE_LANGS: string[];
  ROOM_DEFAULT_PASSWORD: string;
  FEATURE_FLAGS: Record<string, boolean>;
  TELEMETRY_ENABLED: boolean;
  SYNC_TOLERANCE_MS: number;
  SYNC_TIMEOUT_MS: number;
  HEARTBEAT_INTERVAL_MS: number;
  ANNOTATION_RENDER_INTERVAL_MS: number;
  RECONNECT_INTERVAL_MS: number;
  ROOM_STATE_TTL_MS: number;
  VIDEO_DETECT_POLL_MS?: number;
  LOCAL_DEV_MODE: boolean;
  // Privacy and Security Settings
  OAUTH_ENABLED: boolean;
  OAUTH_PROVIDERS: Record<string, OAuthProviderConfig>;
  ALLOW_ANONYMOUS_USERS: boolean;
  E2E_ENCRYPTION_ENABLED: boolean;
  ENCRYPTION_KEY_SIZE: number;
  DATA_RETENTION_ENABLED: boolean;
  CHAT_RETENTION_DAYS: number;
  ROOM_HISTORY_RETENTION_DAYS: number;
  AUTO_DELETE_EXPIRED_DATA: boolean;
  RECORDING_CONSENT_REQUIRED: boolean;
  RECORDING_RETENTION_DAYS: number;
  ANONYMIZE_USER_DATA: boolean;
  // Performance Optimization Settings
  PERFORMANCE_MONITORING_ENABLED: boolean;
  DRIFT_ANALYSIS_ENABLED: boolean;
  BANDWIDTH_MONITORING_ENABLED: boolean;
  ADAPTIVE_QUALITY_ENABLED: boolean;
  RESOURCE_CLEANUP_ENABLED: boolean;
  PERFORMANCE_DIAGNOSTICS_INTERVAL_MS: number;
  MAX_DRIFT_SAMPLES: number;
  PERFORMANCE_LOG_LEVEL: 'none' | 'basic' | 'detailed';
  AUTO_QUALITY_ADJUSTMENT: boolean;
  MEMORY_CLEANUP_INTERVAL_MS: number;
  // Accessibility Settings
  ACCESSIBILITY_SETTINGS?: AccessibilitySettings;
  // Voice Chat Settings
  PUSH_TO_TALK_KEY?: string;
  DEFAULT_VOICE_VOLUME?: number;
  ECHO_CANCELLATION?: boolean;
  NOISE_SUPPRESSION?: boolean;
  AUTO_GAIN_CONTROL?: boolean;
  AUDIO_SAMPLE_RATE?: number;
  VOICE_SIGNALING_ENDPOINT?: string;
}

export interface AccessibilitySettings {
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

export interface OAuthProviderConfig {
  name: string;
  clientId: string;
  authUrl: string;
  tokenUrl: string;
  scope: string[];
  redirectUri: string;
}

export interface TurnServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}
