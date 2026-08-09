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

/**
 * Firefox-specific browser bridge implementation
 * Uses webextension-polyfill for consistent Promise-based API
 */

class FirefoxStorageArea implements StorageArea {
  constructor(private area: typeof browser.storage.local) {}

  async get(
    keys?: string | string[] | Record<string, unknown> | null
  ): Promise<Record<string, unknown>> {
    return this.area.get(keys) as Promise<Record<string, unknown>>;
  }

  async set(items: Record<string, unknown>): Promise<void> {
    return this.area.set(items as Record<string, unknown>);
  }

  async remove(keys: string | string[]): Promise<void> {
    return this.area.remove(keys);
  }

  async clear(): Promise<void> {
    return this.area.clear();
  }
}

class FirefoxRuntimeAPI implements RuntimeAPI {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chrome runtime delivers untyped payloads
  private onMessageListeners = new WeakMap<
    (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chrome runtime delivers untyped payloads
      message: any,
      sender: chrome.runtime.MessageSender | undefined,
      sendResponse: (response?: unknown) => void
    ) => void | boolean | Promise<unknown>,
    (message: unknown, sender: unknown) => Promise<unknown>
  >();

  get id(): string {
    return browser.runtime.id;
  }

  async sendMessage(messageOrExtensionId: unknown, message?: unknown): Promise<unknown> {
    if (typeof messageOrExtensionId === 'string' && message !== undefined) {
      // Extension ID provided
      return browser.runtime.sendMessage(messageOrExtensionId, message as never);
    } else {
      // No extension ID, send to own extension
      return browser.runtime.sendMessage(messageOrExtensionId as never);
    }
  }

  onMessage = {
    addListener: (
      callback: (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chrome runtime delivers untyped payloads
        message: any,
        sender: chrome.runtime.MessageSender | undefined,
        sendResponse: (response?: unknown) => void
      ) => void | boolean | Promise<unknown>
    ) => {
      const listener = (message: unknown, sender: unknown) => {
        return new Promise((resolve) => {
          const result = callback(
            message,
            sender as chrome.runtime.MessageSender | undefined,
            resolve as (response?: unknown) => void
          );
          if (result instanceof Promise) {
            result.then(resolve);
          } else if (typeof result !== 'undefined') {
            resolve(result);
          }
        });
      };

      this.onMessageListeners.set(callback, listener);
      browser.runtime.onMessage.addListener(listener);
    },
    removeListener: (
      callback: (
        message: unknown,
        sender: unknown,
        sendResponse: (response?: unknown) => void
      ) => void | boolean | Promise<unknown>
    ) => {
      const listener = this.onMessageListeners.get(callback);
      if (listener) {
        browser.runtime.onMessage.removeListener(listener);
        this.onMessageListeners.delete(callback);
      }
    },
  };

  getManifest(): Record<string, unknown> {
    return browser.runtime.getManifest() as unknown as Record<string, unknown>;
  }
}

class FirefoxTabsAPI implements TabsAPI {
  async query(queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> {
    return browser.tabs.query(queryInfo as unknown as browser.Tabs.QueryQueryInfoType) as Promise<
      chrome.tabs.Tab[]
    >;
  }

  async sendMessage(tabId: number, message: unknown): Promise<unknown> {
    return browser.tabs.sendMessage(tabId, message as never);
  }

  onUpdated = {
    addListener: (
      callback: (tabId: number, changeInfo: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab) => void
    ) => {
      browser.tabs.onUpdated.addListener(
        callback as unknown as Parameters<typeof browser.tabs.onUpdated.addListener>[0]
      );
    },
    removeListener: (callback: (...args: unknown[]) => void) => {
      browser.tabs.onUpdated.removeListener(
        callback as unknown as Parameters<typeof browser.tabs.onUpdated.removeListener>[0]
      );
    },
  };
}

class FirefoxPermissionsAPI implements PermissionsAPI {
  async request(permissions: chrome.permissions.Permissions): Promise<boolean> {
    return browser.permissions.request(permissions as never);
  }

  async contains(permissions: chrome.permissions.Permissions): Promise<boolean> {
    return browser.permissions.contains(permissions as never);
  }

  async remove(permissions: chrome.permissions.Permissions): Promise<boolean> {
    return browser.permissions.remove(permissions as never);
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
      browser.alarms.onAlarm.addListener(
        callback as unknown as (alarm: {
          name: string;
          scheduledTime: number;
          periodInMinutes?: number;
        }) => void
      );
    },
    removeListener: (callback: (...args: unknown[]) => void) => {
      browser.alarms.onAlarm.removeListener(
        callback as unknown as (alarm: {
          name: string;
          scheduledTime: number;
          periodInMinutes?: number;
        }) => void
      );
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
    return browser.notifications.create(id, options as unknown as never);
  }

  async clear(id: string): Promise<boolean> {
    return browser.notifications.clear(id);
  }

  async clearAll(): Promise<boolean> {
    // Firefox notifications API has no clearAll — clear each notification individually.
    const notificationIds = Object.keys(await browser.notifications.getAll());
    await Promise.all(notificationIds.map((id) => this.clear(id)));
    return notificationIds.length > 0;
  }

  onClicked = {
    addListener: (callback: (notificationId: string) => void) => {
      browser.notifications.onClicked.addListener(callback);
    },
    removeListener: (callback: (...args: unknown[]) => void) => {
      browser.notifications.onClicked.removeListener(
        callback as unknown as (notificationId: string) => void
      );
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
