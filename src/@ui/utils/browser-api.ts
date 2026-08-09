/**
 * Browser API Utility
 * Provides unified interface for Chrome and Firefox WebExtension APIs
 * Enhanced with compatibility detection and error handling
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { getBrowserCompatibilityManager } from './browser-compatibility';

// Minimal shape of the WebExtension manifest used by this module
interface BrowserManifest {
  version?: string;
  name?: string;
  manifest_version?: number;
}

// Loose structural types for the global browser object (Firefox WebExtensions API)
export interface BrowserLikePort {
  onMessage: {
    addListener: (callback: (message: unknown) => void) => void;
    removeListener: (callback: (message: unknown) => void) => void;
  };
  onDisconnect: {
    addListener: (callback: () => void) => void;
  };
  postMessage: (message: unknown) => void;
  disconnect: () => void;
  name?: string;
}

interface BrowserLikeRuntime {
  sendMessage: (message: unknown) => Promise<unknown>;
  openOptionsPage: () => void;
  getManifest: () => unknown;
  getURL: (path: string) => string;
  id?: string;
  connect: (connectInfo?: { name?: string }) => BrowserLikePort;
  onMessage: {
    addListener: (
      callback: (
        message: unknown,
        sender: unknown,
        sendResponse: (response?: unknown) => void
      ) => void | boolean | Promise<unknown>
    ) => void;
    removeListener: (callback: (...args: unknown[]) => void) => void;
  };
  onUpdateAvailable?: {
    addListener: (callback: (details: unknown) => void) => void;
  };
  onInstalled?: {
    addListener: (callback: (details: unknown) => void) => void;
  };
  onStartup?: {
    addListener: (callback: () => void) => void;
  };
}

interface BrowserLikeStorage {
  local: {
    get: (keys?: string[] | string | null) => Promise<unknown>;
    set: (items: Record<string, unknown>) => Promise<void>;
    remove: (keys: string | string[]) => Promise<void>;
    clear: () => Promise<void>;
  };
  onChanged?: {
    addListener: (callback: (changes: unknown, areaName: string) => void) => void;
  };
}

interface BrowserLikeTabs {
  onUpdated: {
    addListener: (callback: (tabId: number, changeInfo: unknown, tab: unknown) => void) => void;
  };
  sendMessage: (tabId: number, message: unknown) => Promise<unknown>;
  query: (queryInfo: unknown) => Promise<unknown>;
}

interface BrowserLikeBrowserAction {
  setTitle: (details: unknown) => Promise<void>;
  setBadgeText: (details: unknown) => Promise<void>;
  setBadgeBackgroundColor: (details: unknown) => Promise<void>;
  onClicked: {
    addListener: (callback: (tab: unknown) => void) => void;
  };
}

interface BrowserLikeNotifications {
  create: (id: string, options: unknown) => Promise<string>;
  clear: (id: string) => Promise<boolean>;
  getAll: () => Promise<unknown>;
  onClicked: {
    addListener: (callback: (notificationId: string) => void) => void;
  };
}

interface BrowserLikeAlarms {
  create: (name: string, alarmInfo?: unknown) => void;
  onAlarm: {
    addListener: (callback: (alarm: unknown) => void) => void;
  };
}

interface BrowserLikePermissions {
  request: (permissions: unknown) => Promise<boolean>;
  contains: (permissions: unknown) => Promise<boolean>;
  remove: (permissions: unknown) => Promise<boolean>;
}

interface BrowserLike {
  runtime: BrowserLikeRuntime;
  storage: BrowserLikeStorage;
  tabs: BrowserLikeTabs;
  browserAction: BrowserLikeBrowserAction;
  notifications: BrowserLikeNotifications;
  alarms: BrowserLikeAlarms;
  permissions: BrowserLikePermissions;
}

// Browser API interface
interface BrowserAPI {
  runtime: {
    sendMessage: (message: unknown) => Promise<unknown>;
    openOptionsPage: () => void;
    getManifest: () => BrowserManifest;
    onMessage: {
      addListener: (callback: (message: unknown) => void) => void;
      removeListener: (callback: (message: unknown) => void) => void;
    };
  };
  storage: {
    local: {
      get: (keys?: string[] | string | null) => Promise<Record<string, unknown>>;
      set: (items: Record<string, unknown>) => Promise<void>;
      clear: () => Promise<void>;
    };
  };
  isAvailable: boolean;
  browserName: string;
  manifestVersion: number;
}

// Get the appropriate browser API with compatibility detection
export const getBrowserAPI = (): BrowserAPI => {
  const compatibilityManager = getBrowserCompatibilityManager();
  const capabilities = compatibilityManager.getBrowserCapabilities();

  // Firefox WebExtensions (check first as Firefox also has chrome object)
  if (typeof browser !== 'undefined' && browser.runtime) {
    return {
      runtime: {
        sendMessage: async (message: unknown) => {
          try {
            return await browser.runtime.sendMessage(message);
          } catch (error) {
            console.warn('Firefox sendMessage failed:', error);
            throw new Error(`Firefox API error: ${error}`);
          }
        },
        openOptionsPage: () => {
          try {
            browser.runtime.openOptionsPage();
          } catch (error) {
            console.warn('Firefox openOptionsPage failed:', error);
            // Fallback to opening options page manually
            window.open(browser.runtime.getURL('options.html'), '_blank');
          }
        },
        getManifest: () => {
          try {
            return browser.runtime.getManifest() as BrowserManifest;
          } catch (error) {
            console.warn('Firefox getManifest failed:', error);
            return { version: '1.0.0', manifest_version: 2, name: 'Watch Party Extension' };
          }
        },
        onMessage: {
          addListener: (callback: (message: unknown) => void) => {
            try {
              browser.runtime.onMessage.addListener(callback);
            } catch (error) {
              console.warn('Firefox onMessage.addListener failed:', error);
            }
          },
          removeListener: (callback: (message: unknown) => void) => {
            try {
              browser.runtime.onMessage.removeListener(callback);
            } catch (error) {
              console.warn('Firefox onMessage.removeListener failed:', error);
            }
          },
        },
      },
      storage: {
        local: {
          get: async (keys?: string[] | string | null) => {
            try {
              return (await browser.storage.local.get(keys)) as Record<string, unknown>;
            } catch (error) {
              console.warn('Firefox storage.get failed:', error);
              return {};
            }
          },
          set: async (items: Record<string, unknown>) => {
            try {
              await browser.storage.local.set(items);
            } catch (error) {
              console.warn('Firefox storage.set failed:', error);
              throw new Error(`Firefox storage error: ${error}`);
            }
          },
          clear: async () => {
            try {
              await browser.storage.local.clear();
            } catch (error) {
              console.warn('Firefox storage.clear failed:', error);
              throw new Error(`Firefox storage error: ${error}`);
            }
          },
        },
      },
      isAvailable: true,
      browserName: 'firefox',
      manifestVersion: 2,
    };
  }

  // Chrome MV3
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    return {
      runtime: {
        sendMessage: async (message: unknown) => {
          try {
            return await chrome.runtime.sendMessage(message);
          } catch (error) {
            console.warn('Chrome sendMessage failed:', error);
            throw new Error(`Chrome API error: ${error}`);
          }
        },
        openOptionsPage: () => {
          try {
            chrome.runtime.openOptionsPage();
          } catch (error) {
            console.warn('Chrome openOptionsPage failed:', error);
            // Fallback to opening options page manually
            window.open(chrome.runtime.getURL('options.html'), '_blank');
          }
        },
        getManifest: () => {
          try {
            return chrome.runtime.getManifest();
          } catch (error) {
            console.warn('Chrome getManifest failed:', error);
            return { version: '1.0.0', manifest_version: 3, name: 'Watch Party Extension' };
          }
        },
        onMessage: {
          addListener: (callback: (message: unknown) => void) => {
            try {
              chrome.runtime.onMessage.addListener(callback);
            } catch (error) {
              console.warn('Chrome onMessage.addListener failed:', error);
            }
          },
          removeListener: (callback: (message: unknown) => void) => {
            try {
              chrome.runtime.onMessage.removeListener(callback);
            } catch (error) {
              console.warn('Chrome onMessage.removeListener failed:', error);
            }
          },
        },
      },
      storage: {
        local: {
          get: async (keys?: string[] | string | null) => {
            try {
              return (await chrome.storage.local.get(keys)) as Record<string, unknown>;
            } catch (error) {
              console.warn('Chrome storage.get failed:', error);
              return {};
            }
          },
          set: async (items: Record<string, unknown>) => {
            try {
              await chrome.storage.local.set(items);
            } catch (error) {
              console.warn('Chrome storage.set failed:', error);
              throw new Error(`Chrome storage error: ${error}`);
            }
          },
          clear: async () => {
            try {
              await chrome.storage.local.clear();
            } catch (error) {
              console.warn('Chrome storage.clear failed:', error);
              throw new Error(`Chrome storage error: ${error}`);
            }
          },
        },
      },
      isAvailable: true,
      browserName: 'chrome',
      manifestVersion: 3,
    };
  }

  // Fallback for development/testing or unsupported browsers
  const browserName = capabilities?.name || 'unknown';
  const manifestVersion = capabilities?.manifestVersion || 3;

  return {
    runtime: {
      sendMessage: async (message: unknown) => {
        console.warn(`Browser API not available (${browserName}), message:`, message);
        return { success: false, error: 'Browser API not available' };
      },
      openOptionsPage: () => {
        console.warn(`Browser API not available (${browserName}), cannot open options page`);
        // Try to open options page using window.open as fallback
        try {
          window.open('options.html', '_blank');
        } catch (error) {
          console.error('Failed to open options page:', error);
        }
      },
      getManifest: () => ({
        version: '1.0.0',
        manifest_version: manifestVersion,
        name: 'Watch Party Extension',
      }),
      onMessage: {
        addListener: () => {
          console.warn(`Browser API not available (${browserName}), cannot add message listener`);
        },
        removeListener: () => {
          console.warn(
            `Browser API not available (${browserName}), cannot remove message listener`
          );
        },
      },
    },
    storage: {
      local: {
        get: async (keys?: string[] | string | null) => {
          console.warn(`Browser API not available (${browserName}), using localStorage fallback`);
          try {
            if (typeof keys === 'string') {
              const value = localStorage.getItem(keys);
              return { [keys]: value ? JSON.parse(value) : undefined };
            } else if (Array.isArray(keys)) {
              const result: Record<string, unknown> = {};
              keys.forEach((key) => {
                const value = localStorage.getItem(key);
                result[key] = value ? JSON.parse(value) : undefined;
              });
              return result;
            } else {
              // Get all items
              const result: Record<string, unknown> = {};
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                  const value = localStorage.getItem(key);
                  result[key] = value ? JSON.parse(value) : undefined;
                }
              }
              return result;
            }
          } catch (error) {
            console.error('localStorage fallback failed:', error);
            return {};
          }
        },
        set: async (items: Record<string, unknown>) => {
          console.warn(`Browser API not available (${browserName}), using localStorage fallback`);
          try {
            Object.entries(items).forEach(([key, value]) => {
              if (value === undefined) {
                localStorage.removeItem(key);
              } else {
                localStorage.setItem(key, JSON.stringify(value));
              }
            });
          } catch (error) {
            console.error('localStorage fallback failed:', error);
            throw new Error(`Storage fallback error: ${error}`);
          }
        },
        clear: async () => {
          console.warn(`Browser API not available (${browserName}), using localStorage fallback`);
          try {
            localStorage.clear();
          } catch (error) {
            console.error('localStorage fallback failed:', error);
            throw new Error(`Storage fallback error: ${error}`);
          }
        },
      },
    },
    isAvailable: false,
    browserName,
    manifestVersion,
  };
};

// Export singleton instance
export const browserAPI = getBrowserAPI();

// Type declarations for global browser APIs
declare global {
  interface Window {
    browser?: BrowserLike;
    hideLoadingFallback?: () => void;
  }

  // Firefox WebExtensions API
  const browser: BrowserLike;
}

export default browserAPI;
