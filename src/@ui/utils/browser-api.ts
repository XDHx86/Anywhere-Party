/**
 * Browser API Utility
 * Provides unified interface for Chrome and Firefox WebExtension APIs
 * Enhanced with compatibility detection and error handling
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { getBrowserCompatibilityManager } from './browser-compatibility';

// Browser API interface
interface BrowserAPI {
  runtime: {
    sendMessage: (message: any) => Promise<any>;
    openOptionsPage: () => void;
    getManifest: () => any;
    onMessage: {
      addListener: (callback: (message: any) => void) => void;
      removeListener: (callback: (message: any) => void) => void;
    };
  };
  storage: {
    local: {
      get: (keys?: string[] | string | null) => Promise<any>;
      set: (items: Record<string, any>) => Promise<void>;
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
        sendMessage: async (message: any) => {
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
            return browser.runtime.getManifest();
          } catch (error) {
            console.warn('Firefox getManifest failed:', error);
            return { version: '1.0.0', manifest_version: 2, name: 'Watch Party Extension' };
          }
        },
        onMessage: {
          addListener: (callback: (message: any) => void) => {
            try {
              browser.runtime.onMessage.addListener(callback);
            } catch (error) {
              console.warn('Firefox onMessage.addListener failed:', error);
            }
          },
          removeListener: (callback: (message: any) => void) => {
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
              return await browser.storage.local.get(keys);
            } catch (error) {
              console.warn('Firefox storage.get failed:', error);
              return {};
            }
          },
          set: async (items: Record<string, any>) => {
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
        sendMessage: async (message: any) => {
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
          addListener: (callback: (message: any) => void) => {
            try {
              chrome.runtime.onMessage.addListener(callback);
            } catch (error) {
              console.warn('Chrome onMessage.addListener failed:', error);
            }
          },
          removeListener: (callback: (message: any) => void) => {
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
              return await chrome.storage.local.get(keys);
            } catch (error) {
              console.warn('Chrome storage.get failed:', error);
              return {};
            }
          },
          set: async (items: Record<string, any>) => {
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
      sendMessage: async (message: any) => {
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
              const result: Record<string, any> = {};
              keys.forEach((key) => {
                const value = localStorage.getItem(key);
                result[key] = value ? JSON.parse(value) : undefined;
              });
              return result;
            } else {
              // Get all items
              const result: Record<string, any> = {};
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
        set: async (items: Record<string, any>) => {
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
    browser?: any;
    hideLoadingFallback?: () => void;
  }

  // Firefox WebExtensions API
  const browser: any;
}

export default browserAPI;
