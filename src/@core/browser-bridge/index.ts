import { BrowserBridge } from './types';
import { createChromeBridge } from './chrome-bridge';
import { createFirefoxBridge } from './firefox-bridge';

/**
 * Browser detection and bridge factory
 */

function detectBrowser(): 'chrome' | 'firefox' | 'unknown' {
  // Check for Chrome-specific APIs
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
    return 'chrome';
  }

  // Check for Firefox-specific APIs or webextension-polyfill
  const browserGlobal = (globalThis as Record<string, unknown>).browser as
    { runtime?: { id?: string } } | undefined;
  if (typeof browserGlobal !== 'undefined' && browserGlobal.runtime && browserGlobal.runtime.id) {
    return 'firefox';
  }

  // Fallback detection based on user agent
  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome') && !userAgent.includes('firefox')) {
      return 'chrome';
    }
    if (userAgent.includes('firefox')) {
      return 'firefox';
    }
  }

  return 'unknown';
}

/**
 * Creates the appropriate browser bridge based on the current environment
 */
export function createBrowserBridge(): BrowserBridge {
  const browserType = detectBrowser();

  switch (browserType) {
    case 'chrome':
      return createChromeBridge();
    case 'firefox':
      return createFirefoxBridge();
    default:
      // Default to Chrome bridge as fallback
      console.warn('Unknown browser detected, falling back to Chrome bridge');
      return createChromeBridge();
  }
}

// Re-export types for convenience
export * from './types';
