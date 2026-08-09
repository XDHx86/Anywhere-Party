/**
 * Cross-Browser Integration Example
 * Shows how to use the cross-browser compatibility system in popup and options pages
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { getCrossBrowserInitializer } from './cross-browser-initializer';
import { getDiagnosticLogger } from './diagnostic-logger';

/**
 * Example integration for popup page
 */
export async function initializePopupWithCrossBrowserSupport(): Promise<void> {
  const crossBrowserInitializer = getCrossBrowserInitializer();
  const diagnosticLogger = getDiagnosticLogger();

  try {
    console.log('🚀 Initializing popup with cross-browser support...');

    // Initialize cross-browser compatibility
    const result = await crossBrowserInitializer.initialize();

    if (result.success) {
      console.log('✅ Cross-browser initialization successful');

      // Show supported features to user
      displaySupportedFeatures(result.supportedFeatures);

      // Initialize popup functionality based on supported features
      await initializePopupFeatures(result);
    } else {
      console.warn('⚠️ Cross-browser initialization failed, using fallback mode');

      // Show compatibility warnings to user
      displayCompatibilityWarnings(result.warnings);

      // Initialize fallback popup functionality
      await initializeFallbackPopup(result);
    }
  } catch (error) {
    console.error('❌ Failed to initialize popup with cross-browser support:', error);
    diagnosticLogger.logComponentError('PopupCrossBrowserInit', error as Error);

    // Initialize basic fallback
    await initializeBasicFallback();
  }
}

/**
 * Example integration for options page
 */
export async function initializeOptionsWithCrossBrowserSupport(): Promise<void> {
  const crossBrowserInitializer = getCrossBrowserInitializer();
  const diagnosticLogger = getDiagnosticLogger();

  try {
    console.log('⚙️ Initializing options with cross-browser support...');

    // Initialize cross-browser compatibility
    const result = await crossBrowserInitializer.initialize();

    if (result.success) {
      console.log('✅ Cross-browser initialization successful');

      // Initialize options functionality based on supported features
      await initializeOptionsFeatures(result);
    } else {
      console.warn('⚠️ Cross-browser initialization failed, using fallback mode');

      // Initialize fallback options functionality
      await initializeFallbackOptions(result);
    }
  } catch (error) {
    console.error('❌ Failed to initialize options with cross-browser support:', error);
    diagnosticLogger.logComponentError('OptionsCrossBrowserInit', error as Error);

    // Initialize basic fallback
    await initializeBasicOptionsPage();
  }
}

/**
 * Display supported features to user
 */
function displaySupportedFeatures(features: unknown): void {
  const featureList = document.getElementById('supported-features');
  if (!featureList) return;

  const featureNames = {
    webExtensionAPI: 'Extension API',
    backgroundScript: 'Background Script',
    contentScript: 'Content Script',
    storage: 'Storage',
    messaging: 'Messaging',
    webRTC: 'Voice Chat (WebRTC)',
    serviceWorker: 'Service Worker',
  };

  featureList.innerHTML = '';

  Object.entries(features as Record<string, boolean>).forEach(([key, supported]) => {
    const item = document.createElement('div');
    item.className = `feature-item ${supported ? 'supported' : 'unsupported'}`;
    item.innerHTML = `
      <span class="feature-name">${featureNames[key as keyof typeof featureNames] || key}</span>
      <span class="feature-status">${supported ? '✅' : '❌'}</span>
    `;
    featureList.appendChild(item);
  });
}

/**
 * Display compatibility warnings to user
 */
function displayCompatibilityWarnings(warnings: unknown[]): void {
  const warningContainer = document.getElementById('compatibility-warnings');
  if (!warningContainer || warnings.length === 0) return;

  warningContainer.innerHTML = '';

  warnings.forEach((warning) => {
    const warningData = warning as { type?: string; message?: string; recommendation?: string };
    const warningElement = document.createElement('div');
    warningElement.className = `warning ${warningData.type ?? ''}`;
    warningElement.innerHTML = `
      <div class="warning-message">${warningData.message ?? ''}</div>
      ${warningData.recommendation ? `<div class="warning-recommendation">${warningData.recommendation}</div>` : ''}
    `;
    warningContainer.appendChild(warningElement);
  });

  warningContainer.style.display = 'block';
}

/**
 * Initialize popup features based on browser capabilities
 */
async function initializePopupFeatures(result: unknown): Promise<void> {
  const { supportedFeatures, browser } = result as {
    supportedFeatures: Record<string, boolean>;
    browser: string;
  };

  // Initialize core popup functionality
  await initializeCorePopup();

  // Initialize browser-specific features
  if (browser === 'chrome') {
    await initializeChromePopupFeatures(supportedFeatures);
  } else if (browser === 'firefox') {
    await initializeFirefoxPopupFeatures(supportedFeatures);
  }

  // Initialize optional features based on support
  if (supportedFeatures.webRTC) {
    await initializeVoiceChatFeatures();
  }

  if (supportedFeatures.backgroundScript) {
    await initializeBackgroundCommunication();
  }

  console.log('✅ Popup features initialized successfully');
}

/**
 * Initialize options features based on browser capabilities
 */
async function initializeOptionsFeatures(result: unknown): Promise<void> {
  const { supportedFeatures, browser } = result as {
    supportedFeatures: Record<string, boolean>;
    browser: string;
  };

  // Initialize core options functionality
  await initializeCoreOptions();

  // Initialize browser-specific features
  if (browser === 'chrome') {
    await initializeChromeOptionsFeatures(supportedFeatures);
  } else if (browser === 'firefox') {
    await initializeFirefoxOptionsFeatures(supportedFeatures);
  }

  // Initialize storage-dependent features
  if (supportedFeatures.storage) {
    await initializeSettingsPersistence();
  }

  console.log('✅ Options features initialized successfully');
}

/**
 * Initialize fallback popup when cross-browser support fails
 */
async function initializeFallbackPopup(result: unknown): Promise<void> {
  console.log('🔄 Initializing fallback popup...');

  // Hide advanced features
  const advancedFeatures = document.querySelectorAll('.advanced-feature');
  advancedFeatures.forEach((element) => {
    (element as HTMLElement).style.display = 'none';
  });

  // Show fallback message
  const fallbackMessage = document.getElementById('fallback-message');
  if (fallbackMessage) {
    fallbackMessage.style.display = 'block';
    fallbackMessage.innerHTML = `
      <div class="fallback-notice">
        <h3>Limited Functionality Mode</h3>
        <p>Some features are not available in your current browser.</p>
        <ul>
          ${(result as { recommendations?: string[] }).recommendations?.map((rec: string) => `<li>${rec}</li>`).join('') ?? ''}
        </ul>
      </div>
    `;
  }

  // Initialize basic functionality only
  await initializeBasicPopupFunctionality();
}

/**
 * Initialize fallback options when cross-browser support fails
 */
async function initializeFallbackOptions(result: unknown): Promise<void> {
  console.log('🔄 Initializing fallback options...');

  // Show compatibility information
  const compatibilityInfo = document.getElementById('compatibility-info');
  if (compatibilityInfo) {
    compatibilityInfo.innerHTML = `
      <div class="compatibility-notice">
        <h3>Browser Compatibility</h3>
        <p>Browser: ${(result as { browser?: string }).browser ?? 'unknown'} ${(result as { version?: string }).version ?? ''}</p>
        <p>Some features may not be available.</p>
      </div>
    `;
  }

  // Initialize basic options functionality
  await initializeBasicOptionsPage();
}

// Placeholder implementations for the various initialization functions
async function initializeCorePopup(): Promise<void> {
  console.log('Initializing core popup functionality...');
}

async function initializeCoreOptions(): Promise<void> {
  console.log('Initializing core options functionality...');
}

async function initializeChromePopupFeatures(_features: unknown): Promise<void> {
  console.log('Initializing Chrome-specific popup features...');
}

async function initializeFirefoxPopupFeatures(_features: unknown): Promise<void> {
  console.log('Initializing Firefox-specific popup features...');
}

async function initializeChromeOptionsFeatures(_features: unknown): Promise<void> {
  console.log('Initializing Chrome-specific options features...');
}

async function initializeFirefoxOptionsFeatures(_features: unknown): Promise<void> {
  console.log('Initializing Firefox-specific options features...');
}

async function initializeVoiceChatFeatures(): Promise<void> {
  console.log('Initializing voice chat features...');
}

async function initializeBackgroundCommunication(): Promise<void> {
  console.log('Initializing background script communication...');
}

async function initializeSettingsPersistence(): Promise<void> {
  console.log('Initializing settings persistence...');
}

async function initializeBasicPopupFunctionality(): Promise<void> {
  console.log('Initializing basic popup functionality...');
}

async function initializeBasicOptionsPage(): Promise<void> {
  console.log('Initializing basic options page...');
}

async function initializeBasicFallback(): Promise<void> {
  console.log('Initializing basic fallback functionality...');
}
