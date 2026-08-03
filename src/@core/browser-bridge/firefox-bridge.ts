import browser from 'webextension-polyfill';
import {
  BrowserBridge,
  StorageArea,
  RuntimeAPI,
  TabsAPI,
  PermissionsAPI,
  AlarmsAPI,
  NotificationsAPI,
} from './types';

// Type aliases for better compatibility
type BrowserTabs = typeof browser.tabs;
type BrowserRuntime = typeof browser.runtime;
type BrowserPermissions = typeof browser.permissions;

/**
 * Firefox-specific browser bridge implementation
 * Uses webextension-polyfill for consistent Promise-based API
 */

class FirefoxStorageArea implements StorageArea {
  constructor(private area: typeof browser.storage.local) {}

  async get(keys?: string | string[] | Record<string, any> | null): Promise<Record<string, any>> {
    return this.area.get(keys);
  }

  async set(items: Record<string, any>): Promise<void> {
    return this.area.set(items);
  }

  async remove(keys: string | string[]): Promise<void> {
    return this.area.remove(keys);
  }

  async clear(): Promise<void> {
    return this.area.clear();
  }
}

class FirefoxRuntimeAPI implements RuntimeAPI {
  get id(): string {
    return browser.runtime.id;
  }

  async sendMessage(messageOrExtensionId: any, message?: any): Promise<any> {
    if (typeof messageOrExtensionId === 'string' && message !== undefined) {
      // Extension ID provided
      return browser.runtime.sendMessage(messageOrExtensionId, message);
    } else {
      // No extension ID, send to own extension
      return browser.runtime.sendMessage(messageOrExtensionId);
    }
  }

  onMessage = {
    addListener: (
      callback: (
        message: any,
        sender: any,
        sendResponse: (response?: any) => void
      ) => void | boolean | Promise<any>
    ) => {
      browser.runtime.onMessage.addListener((message, sender) => {
        return new Promise((resolve) => {
          const result = callback(message, sender, resolve);
          if (result instanceof Promise) {
            result.then(resolve);
          } else if (typeof result !== 'undefined') {
            resolve(result);
          }
        });
      });
    },
    removeListener: (callback: Function) => {
      browser.runtime.onMessage.removeListener(callback as any);
    },
  };

  getManifest(): any {
    return browser.runtime.getManifest();
  }
}

class FirefoxTabsAPI implements TabsAPI {
  async query(queryInfo: any): Promise<any[]> {
    return browser.tabs.query(queryInfo);
  }

  async sendMessage(tabId: number, message: any): Promise<any> {
    return browser.tabs.sendMessage(tabId, message);
  }

  onUpdated = {
    addListener: (callback: (tabId: number, changeInfo: any, tab: any) => void) => {
      browser.tabs.onUpdated.addListener(callback);
    },
    removeListener: (callback: Function) => {
      browser.tabs.onUpdated.removeListener(callback as any);
    },
  };
}

class FirefoxPermissionsAPI implements PermissionsAPI {
  async request(permissions: any): Promise<boolean> {
    return browser.permissions.request(permissions);
  }

  async contains(permissions: any): Promise<boolean> {
    return browser.permissions.contains(permissions);
  }

  async remove(permissions: any): Promise<boolean> {
    return browser.permissions.remove(permissions);
  }
}

class FirefoxAlarmsAPI implements AlarmsAPI {
  create(
    name: string,
    alarmInfo: { when?: number; delayInMinutes?: number; periodInMinutes?: number }
  ): void {
    browser.alarms.create(name, alarmInfo);
  }

  async clear(name: string): Promise<boolean> {
    return browser.alarms.clear(name);
  }

  async clearAll(): Promise<boolean> {
    return browser.alarms.clearAll();
  }

  onAlarm = {
    addListener: (
      callback: (alarm: { name: string; scheduledTime: number; periodInMinutes?: number }) => void
    ) => {
      browser.alarms.onAlarm.addListener(callback as any);
    },
    removeListener: (callback: Function) => {
      browser.alarms.onAlarm.removeListener(callback as any);
    },
  };
}

class FirefoxNotificationsAPI implements NotificationsAPI {
  async create(
    id: string,
    options: {
      type?: string;
      title?: string;
      message?: string;
      iconUrl?: string;
      priority?: number;
      buttons?: Array<{ title: string; iconUrl?: string }>;
    }
  ): Promise<string> {
    return browser.notifications.create(id, options as any);
  }

  async clear(id: string): Promise<boolean> {
    return browser.notifications.clear(id);
  }

  async clearAll(): Promise<boolean> {
    return browser.notifications.clearAll();
  }

  onClicked = {
    addListener: (callback: (notificationId: string) => void) => {
      browser.notifications.onClicked.addListener(callback);
    },
    removeListener: (callback: Function) => {
      browser.notifications.onClicked.removeListener(callback as any);
    },
  };
}

export function createFirefoxBridge(): BrowserBridge {
  const manifest = browser.runtime.getManifest();
  const manifestVersion = manifest.manifest_version || 2;

  return {
    storage: {
      local: new FirefoxStorageArea(browser.storage.local),
      sync: new FirefoxStorageArea(browser.storage.local), // Use local for both to avoid type issues
    },
    runtime: new FirefoxRuntimeAPI(),
    tabs: new FirefoxTabsAPI(),
    permissions: new FirefoxPermissionsAPI(),
    alarms: new FirefoxAlarmsAPI(),
    notifications: new FirefoxNotificationsAPI(),
    isChrome: false,
    isFirefox: true,
    manifestVersion,
  };
}
