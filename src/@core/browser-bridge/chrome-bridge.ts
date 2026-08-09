import {
  BrowserBridge,
  StorageArea,
  RuntimeAPI,
  TabsAPI,
  PermissionsAPI,
  AlarmsAPI,
  NotificationsAPI,
} from './types';

type TabChangeInfoType = Parameters<Parameters<typeof chrome.tabs.onUpdated.addListener>[0]>[1];

/**
 * Chrome-specific browser bridge implementation
 * Handles both Manifest V2 and V3 compatibility
 */

class ChromeStorageArea implements StorageArea {
  constructor(private area: chrome.storage.StorageArea) {}

  async get(
    keys?: string | string[] | Record<string, unknown> | null
  ): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      this.area.get(
        keys as string | string[] | Record<string, unknown>,
        resolve as (items: { [key: string]: unknown }) => void
      );
    });
  }

  async set(items: Record<string, unknown>): Promise<void> {
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

  async sendMessage(messageOrExtensionId: unknown, message?: unknown): Promise<unknown> {
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
        chrome.runtime.sendMessage(messageOrExtensionId as unknown, (response) => {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chrome runtime delivers untyped payloads
        message: any,
        sender: chrome.runtime.MessageSender | undefined,
        sendResponse: (response?: unknown) => void
      ) => void | boolean | Promise<unknown>
    ) => {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const result = callback(message, sender, sendResponse);
        if (result instanceof Promise) {
          result.then(sendResponse as (response: unknown) => void);
          return true; // Keep message channel open for async response
        }
        return result;
      });
    },
    removeListener: (callback: (...args: unknown[]) => void) => {
      chrome.runtime.onMessage.removeListener(
        callback as unknown as (
          message: unknown,
          sender: unknown,
          sendResponse: (response?: unknown) => void
        ) => void
      );
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

  async sendMessage(tabId: number, message: unknown): Promise<unknown> {
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
      callback: (tabId: number, changeInfo: TabChangeInfoType, tab: chrome.tabs.Tab) => void
    ) => {
      chrome.tabs.onUpdated.addListener(callback);
    },
    removeListener: (callback: (...args: unknown[]) => void) => {
      chrome.tabs.onUpdated.removeListener(
        callback as unknown as (
          tabId: number,
          changeInfo: TabChangeInfoType,
          tab: chrome.tabs.Tab
        ) => void
      );
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

class ChromeAlarmsAPI implements AlarmsAPI {
  create(
    name: string,
    alarmInfo: { when?: number; delayInMinutes?: number; periodInMinutes?: number }
  ): void {
    chrome.alarms.create(name, alarmInfo as chrome.alarms.AlarmCreateInfo);
  }

  async clear(name: string): Promise<boolean> {
    return chrome.alarms.clear(name);
  }

  async clearAll(): Promise<boolean> {
    return chrome.alarms.clearAll();
  }

  onAlarm = {
    addListener: (
      callback: (alarm: { name: string; scheduledTime: number; periodInMinutes?: number }) => void
    ) => {
      chrome.alarms.onAlarm.addListener(
        callback as unknown as (alarm: chrome.alarms.Alarm) => void
      );
    },
    removeListener: (callback: (...args: unknown[]) => void) => {
      chrome.alarms.onAlarm.removeListener(
        callback as unknown as (alarm: chrome.alarms.Alarm) => void
      );
    },
  };
}

class ChromeNotificationsAPI implements NotificationsAPI {
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
    return new Promise((resolve) => {
      chrome.notifications.create(
        id,
        options as unknown as chrome.notifications.NotificationCreateOptions,
        (notifId) => {
          resolve(notifId);
        }
      );
    });
  }

  async clear(id: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      chrome.notifications.clear(id, (wasCleared) => resolve(wasCleared));
    });
  }

  async clearAll(): Promise<boolean> {
    // chrome.notifications has no clearAll API — clear every notification individually.
    const notificationIds = await this.getAll();
    await Promise.all(notificationIds.map((id) => this.clear(id)));
    return notificationIds.length > 0;
  }

  private getAll(): Promise<string[]> {
    return new Promise<string[]>((resolve) => {
      chrome.notifications.getAll((notifications) => resolve(Object.keys(notifications || {})));
    });
  }

  onClicked = {
    addListener: (callback: (notificationId: string) => void) => {
      chrome.notifications.onClicked.addListener(callback);
    },
    removeListener: (callback: (...args: unknown[]) => void) => {
      chrome.notifications.onClicked.removeListener(
        callback as unknown as (notificationId: string) => void
      );
    },
  };
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
    alarms: new ChromeAlarmsAPI(),
    notifications: new ChromeNotificationsAPI(),
    isChrome: true,
    isFirefox: false,
    manifestVersion,
  };
}
