import { BrowserBridge, StorageArea, RuntimeAPI, TabsAPI, PermissionsAPI } from './types';

/**
 * Chrome-specific browser bridge implementation
 * Handles both Manifest V2 and V3 compatibility
 */

class ChromeStorageArea implements StorageArea {
  constructor(private area: chrome.storage.StorageArea) {}

  async get(keys?: string | string[] | Record<string, any> | null): Promise<Record<string, any>> {
    return new Promise((resolve) => {
      this.area.get(keys as any, resolve);
    });
  }

  async set(items: Record<string, any>): Promise<void> {
    return new Promise((resolve) => {
      this.area.set(items, resolve);
    });
  }

  async remove(keys: string | string[]): Promise<void> {
    return new Promise((resolve) => {
      this.area.remove(keys, resolve);
    });
  }

  async clear(): Promise<void> {
    return new Promise((resolve) => {
      this.area.clear(resolve);
    });
  }
}

class ChromeRuntimeAPI implements RuntimeAPI {
  get id(): string {
    return chrome.runtime.id;
  }

  async sendMessage(messageOrExtensionId: any, message?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (typeof messageOrExtensionId === 'string' && message !== undefined) {
        // Extension ID provided
        chrome.runtime.sendMessage(messageOrExtensionId, message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } else {
        // No extension ID, send to own extension
        chrome.runtime.sendMessage(messageOrExtensionId, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      }
    });
  }

  onMessage = {
    addListener: (
      callback: (
        message: any,
        sender: any,
        sendResponse: (response?: any) => void
      ) => void | boolean | Promise<any>
    ) => {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const result = callback(message, sender, sendResponse);
        if (result instanceof Promise) {
          result.then(sendResponse);
          return true; // Keep message channel open for async response
        }
        return result;
      });
    },
    removeListener: (callback: Function) => {
      chrome.runtime.onMessage.removeListener(callback as any);
    },
  };

  getManifest(): chrome.runtime.Manifest {
    return chrome.runtime.getManifest();
  }
}

class ChromeTabsAPI implements TabsAPI {
  async query(queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> {
    return new Promise((resolve) => {
      chrome.tabs.query(queryInfo, resolve);
    });
  }

  async sendMessage(tabId: number, message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  onUpdated = {
    addListener: (
      callback: (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => void
    ) => {
      chrome.tabs.onUpdated.addListener(callback);
    },
    removeListener: (callback: Function) => {
      chrome.tabs.onUpdated.removeListener(callback as any);
    },
  };
}

class ChromePermissionsAPI implements PermissionsAPI {
  async request(permissions: chrome.permissions.Permissions): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.permissions.request(permissions, resolve);
    });
  }

  async contains(permissions: chrome.permissions.Permissions): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.permissions.contains(permissions, resolve);
    });
  }

  async remove(permissions: chrome.permissions.Permissions): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.permissions.remove(permissions, resolve);
    });
  }
}

export function createChromeBridge(): BrowserBridge {
  const manifest = chrome.runtime.getManifest();
  const manifestVersion = manifest.manifest_version || 2;

  return {
    storage: {
      local: new ChromeStorageArea(chrome.storage.local),
      sync: new ChromeStorageArea(chrome.storage.sync),
    },
    runtime: new ChromeRuntimeAPI(),
    tabs: new ChromeTabsAPI(),
    permissions: new ChromePermissionsAPI(),
    isChrome: true,
    isFirefox: false,
    manifestVersion,
  };
}
