/**
 * Popup Scrolling End-to-End Tests with Playwright
 * Tests Requirements 31.1, 31.2, 31.3, 31.4, 31.5
 *
 * Validates scrolling behavior in real browser environments:
 * - Chrome MV3 extension popup
 * - Firefox WebExtension popup
 * - Keyboard navigation and focus management
 * - Smooth scrolling behavior
 * - Dimension consistency
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import path from 'path';

// Test configuration for different browsers
const EXTENSION_PATHS = {
  chrome: path.resolve(__dirname, '../../../dist/chrome'),
  firefox: path.resolve(__dirname, '../../../dist/firefox'),
};

const POPUP_DIMENSIONS = {
  width: 380,
  minHeight: 240,
  maxHeight: 600,
};

// Helper functions for popup testing
class PopupScrollingTestHelper {
  constructor(private page: Page) {}

  async openPopup(): Promise<void> {
    // For Chrome extension testing
    if (this.page.context().browser()?.browserType().name() === 'chromium') {
      await this.page.goto('chrome-extension://test-extension-id/popup.html');
    } else {
      // For Firefox extension testing
      await this.page.goto('moz-extension://test-extension-id/popup.html');
    }

    // Wait for popup to load
    await this.page.waitForSelector('[data-testid="popup-header"]', { timeout: 5000 });
  }

  async getPopupDimensions(): Promise<{ width: number; height: number }> {
    const popup = await this.page.locator('body').first();
    const box = await popup.boundingBox();
    return { width: box?.width || 0, height: box?.height || 0 };
  }

  async getScrollContainer(): Promise<any> {
    return this.page.locator('[role="main"][aria-label="Main popup content"]').first();
  }

  async addTallContent(): Promise<void> {
    // Inject tall content to make scrolling necessary
    await this.page.evaluate(() => {
      const content = document.querySelector('[role="main"]');
      if (content) {
        // Add multiple cards to create scrollable content
        for (let i = 0; i < 10; i++) {
          const card = document.createElement('div');
          card.className = 'card';
          card.style.height = '120px';
          card.style.marginBottom = '16px';
          card.style.backgroundColor = '#f5f5f5';
          card.style.borderRadius = '12px';
          card.style.padding = '16px';
          card.innerHTML = `<h3>Test Card ${i + 1}</h3><p>This is test content to create a scrollable popup.</p>`;
          content.appendChild(card);
        }
      }
    });
  }

  async getScrollPosition(): Promise<{ top: number; left: number }> {
    const scrollContainer = await this.getScrollContainer();
    return await scrollContainer.evaluate((el: HTMLElement) => ({
      top: el.scrollTop,
      left: el.scrollLeft,
    }));
  }

  async scrollTo(top: number): Promise<void> {
    const scrollContainer = await this.getScrollContainer();
    await scrollContainer.evaluate((el: HTMLElement, scrollTop: number) => {
      el.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }, top);
  }

  async scrollBy(deltaY: number): Promise<void> {
    const scrollContainer = await this.getScrollContainer();
    await scrollContainer.evaluate((el: HTMLElement, delta: number) => {
      el.scrollBy({ top: delta, behavior: 'smooth' });
    }, deltaY);
  }

  async getScrollHeight(): Promise<number> {
    const scrollContainer = await this.getScrollContainer();
    return await scrollContainer.evaluate((el: HTMLElement) => el.scrollHeight);
  }

  async getClientHeight(): Promise<number> {
    const scrollContainer = await this.getScrollContainer();
    return await scrollContainer.evaluate((el: HTMLElement) => el.clientHeight);
  }

  async hasOverflowYAuto(): Promise<boolean> {
    const scrollContainer = await this.getScrollContainer();
    return await scrollContainer.evaluate((el: HTMLElement) => {
      const style = window.getComputedStyle(el);
      return style.overflowY === 'auto';
    });
  }

  async hasSmoothScrollBehavior(): Promise<boolean> {
    const scrollContainer = await this.getScrollContainer();
    return await scrollContainer.evaluate((el: HTMLElement) => {
      const style = window.getComputedStyle(el);
      return style.scrollBehavior === 'smooth';
    });
  }

  async simulateKeyboardScrolling(key: string, modifiers?: string[]): Promise<void> {
    const scrollContainer = await this.getScrollContainer();
    await scrollContainer.focus();
    await this.page.keyboard.press(modifiers ? `${modifiers.join('+')}+${key}` : key);
  }

  async addFocusableElements(): Promise<void> {
    await this.page.evaluate(() => {
      const content = document.querySelector('[role="main"]');
      if (content) {
        // Add focusable buttons throughout the content
        for (let i = 0; i < 15; i++) {
          const button = document.createElement('button');
          button.id = `test-button-${i}`;
          button.textContent = `Test Button ${i + 1}`;
          button.style.display = 'block';
          button.style.margin = '8px 0';
          button.style.padding = '12px 16px';
          button.style.width = '100%';
          content.appendChild(button);
        }
      }
    });
  }

  async focusElement(elementId: string): Promise<void> {
    await this.page.locator(`#${elementId}`).focus();
  }

  async isElementInView(elementId: string): Promise<boolean> {
    return await this.page.evaluate((id: string) => {
      const element = document.getElementById(id);
      const container = document.querySelector('[role="main"]');

      if (!element || !container) return false;

      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      return elementRect.top >= containerRect.top && elementRect.bottom <= containerRect.bottom;
    }, elementId);
  }
}

// Chrome extension tests
test.describe('Chrome Extension Popup Scrolling', () => {
  let context: BrowserContext;
  let page: Page;
  let helper: PopupScrollingTestHelper;

  test.beforeAll(async ({ browser }) => {
    // Load Chrome extension
    context = await browser.newContext({
      // Note: In real tests, you would load the actual extension
      // This is a simplified setup for demonstration
    });
    page = await context.newPage();
    helper = new PopupScrollingTestHelper(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should maintain popup dimensions during scrolling', async () => {
    await helper.openPopup();

    // Get initial dimensions
    const initialDimensions = await helper.getPopupDimensions();
    expect(initialDimensions.width).toBe(POPUP_DIMENSIONS.width);
    expect(initialDimensions.height).toBeLessThanOrEqual(POPUP_DIMENSIONS.maxHeight);
    expect(initialDimensions.height).toBeGreaterThanOrEqual(POPUP_DIMENSIONS.minHeight);

    // Add tall content to trigger scrolling
    await helper.addTallContent();

    // Dimensions should remain unchanged
    const dimensionsAfterContent = await helper.getPopupDimensions();
    expect(dimensionsAfterContent.width).toBe(initialDimensions.width);
    expect(dimensionsAfterContent.height).toBe(initialDimensions.height);

    // Scroll and check dimensions again
    await helper.scrollTo(200);
    const dimensionsAfterScroll = await helper.getPopupDimensions();
    expect(dimensionsAfterScroll.width).toBe(initialDimensions.width);
    expect(dimensionsAfterScroll.height).toBe(initialDimensions.height);
  });

  test('should have overflow-y: auto on scroll container', async () => {
    await helper.openPopup();

    // Check CSS property
    const hasOverflowAuto = await helper.hasOverflowYAuto();
    expect(hasOverflowAuto).toBe(true);
  });

  test('should enable vertical scrolling when content overflows', async () => {
    await helper.openPopup();
    await helper.addTallContent();

    // Check if content is scrollable
    const scrollHeight = await helper.getScrollHeight();
    const clientHeight = await helper.getClientHeight();
    expect(scrollHeight).toBeGreaterThan(clientHeight);

    // Test scrolling
    const initialPosition = await helper.getScrollPosition();
    expect(initialPosition.top).toBe(0);

    await helper.scrollTo(100);
    await page.waitForTimeout(300); // Wait for smooth scroll

    const newPosition = await helper.getScrollPosition();
    expect(newPosition.top).toBeGreaterThan(0);
  });

  test('should support keyboard navigation for scrolling', async () => {
    await helper.openPopup();
    await helper.addTallContent();

    // Test Ctrl+ArrowDown
    await helper.simulateKeyboardScrolling('ArrowDown', ['Control']);
    await page.waitForTimeout(200);

    let position = await helper.getScrollPosition();
    expect(position.top).toBeGreaterThan(0);

    // Test PageDown
    await helper.simulateKeyboardScrolling('PageDown');
    await page.waitForTimeout(200);

    const positionAfterPageDown = await helper.getScrollPosition();
    expect(positionAfterPageDown.top).toBeGreaterThan(position.top);

    // Test Ctrl+Home
    await helper.simulateKeyboardScrolling('Home', ['Control']);
    await page.waitForTimeout(200);

    position = await helper.getScrollPosition();
    expect(position.top).toBe(0);
  });

  test('should maintain focus visibility during scrolling', async () => {
    await helper.openPopup();
    await helper.addFocusableElements();

    // Focus an element that's initially out of view
    await helper.focusElement('test-button-10');
    await page.waitForTimeout(300);

    // Element should be scrolled into view
    const isInView = await helper.isElementInView('test-button-10');
    expect(isInView).toBe(true);

    // Focus should be visible
    const focusedElement = await page.locator(':focus');
    expect(await focusedElement.getAttribute('id')).toBe('test-button-10');
  });

  test('should have smooth scrolling behavior', async () => {
    await helper.openPopup();
    await helper.addTallContent();

    // Check CSS property
    const hasSmoothScroll = await helper.hasSmoothScrollBehavior();
    expect(hasSmoothScroll).toBe(true);

    // Test smooth scrolling by measuring scroll position over time
    const startTime = Date.now();
    await helper.scrollTo(300);

    // Check intermediate position (should be animating)
    await page.waitForTimeout(50);
    const intermediatePosition = await helper.getScrollPosition();

    // Wait for animation to complete
    await page.waitForTimeout(300);
    const finalPosition = await helper.getScrollPosition();

    expect(finalPosition.top).toBe(300);
    // Intermediate position should be between start and end (indicating animation)
    expect(intermediatePosition.top).toBeGreaterThan(0);
    expect(intermediatePosition.top).toBeLessThan(300);
  });
});

// Firefox extension tests
test.describe('Firefox Extension Popup Scrolling', () => {
  let context: BrowserContext;
  let page: Page;
  let helper: PopupScrollingTestHelper;

  test.beforeAll(async ({ browser }) => {
    // Skip if not Firefox
    test.skip(browser.browserType().name() !== 'firefox', 'Firefox-specific tests');

    context = await browser.newContext();
    page = await context.newPage();
    helper = new PopupScrollingTestHelper(page);
  });

  test.afterAll(async () => {
    if (context) await context.close();
  });

  test('should have Firefox-specific smooth scrolling', async () => {
    await helper.openPopup();
    await helper.addTallContent();

    // Firefox should have smooth scroll behavior
    const hasSmoothScroll = await helper.hasSmoothScrollBehavior();
    expect(hasSmoothScroll).toBe(true);

    // Test scrolling works smoothly
    await helper.scrollTo(200);
    await page.waitForTimeout(300);

    const position = await helper.getScrollPosition();
    expect(position.top).toBe(200);
  });

  test('should handle Firefox scrollbar styling', async () => {
    await helper.openPopup();
    await helper.addTallContent();

    // Check that scrollbar is styled (Firefox uses scrollbar-width and scrollbar-color)
    const scrollContainer = await helper.getScrollContainer();
    const scrollbarWidth = await scrollContainer.evaluate((el: HTMLElement) => {
      const style = window.getComputedStyle(el);
      return style.scrollbarWidth;
    });

    expect(scrollbarWidth).toBe('thin');
  });
});

// Cross-browser compatibility tests
test.describe('Cross-Browser Popup Scrolling Compatibility', () => {
  let context: BrowserContext;
  let page: Page;
  let helper: PopupScrollingTestHelper;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    helper = new PopupScrollingTestHelper(page);
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should work consistently across browsers', async () => {
    await helper.openPopup();
    await helper.addTallContent();

    // Basic scrolling should work the same way
    await helper.scrollTo(150);
    await page.waitForTimeout(200);

    const position = await helper.getScrollPosition();
    expect(position.top).toBe(150);

    // Dimensions should be consistent
    const dimensions = await helper.getPopupDimensions();
    expect(dimensions.width).toBe(POPUP_DIMENSIONS.width);
  });

  test('should handle edge cases consistently', async () => {
    await helper.openPopup();
    await helper.addTallContent();

    // Test scrolling beyond bounds
    await helper.scrollTo(-100);
    await page.waitForTimeout(200);

    let position = await helper.getScrollPosition();
    expect(position.top).toBe(0); // Should clamp to 0

    // Test scrolling beyond maximum
    const scrollHeight = await helper.getScrollHeight();
    const clientHeight = await helper.getClientHeight();
    const maxScroll = scrollHeight - clientHeight;

    await helper.scrollTo(maxScroll + 100);
    await page.waitForTimeout(200);

    position = await helper.getScrollPosition();
    expect(position.top).toBe(maxScroll); // Should clamp to maximum
  });

  test('should handle rapid scroll operations', async () => {
    await helper.openPopup();
    await helper.addTallContent();

    // Perform rapid scrolling
    await helper.scrollBy(50);
    await helper.scrollBy(50);
    await helper.scrollBy(50);

    await page.waitForTimeout(300);

    const position = await helper.getScrollPosition();
    expect(position.top).toBe(150);
  });
});

// Performance and accessibility tests
test.describe('Popup Scrolling Performance and Accessibility', () => {
  let context: BrowserContext;
  let page: Page;
  let helper: PopupScrollingTestHelper;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    helper = new PopupScrollingTestHelper(page);
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should maintain good performance during scrolling', async () => {
    await helper.openPopup();
    await helper.addTallContent();

    // Measure scroll performance
    const startTime = Date.now();

    for (let i = 0; i < 10; i++) {
      await helper.scrollBy(30);
      await page.waitForTimeout(10);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete within reasonable time (less than 2 seconds)
    expect(duration).toBeLessThan(2000);
  });

  test('should be accessible with screen readers', async () => {
    await helper.openPopup();
    await helper.addTallContent();

    // Check ARIA attributes
    const scrollContainer = await helper.getScrollContainer();
    const role = await scrollContainer.getAttribute('role');
    const ariaLabel = await scrollContainer.getAttribute('aria-label');

    expect(role).toBe('main');
    expect(ariaLabel).toBe('Main popup content');

    // Check that container is focusable for keyboard navigation
    const tabIndex = await scrollContainer.getAttribute('tabindex');
    expect(tabIndex).toBe('0');
  });

  test('should handle high contrast mode', async () => {
    // Enable high contrast mode simulation
    await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });

    await helper.openPopup();
    await helper.addTallContent();

    // Scrolling should still work in high contrast mode
    await helper.scrollTo(100);
    await page.waitForTimeout(200);

    const position = await helper.getScrollPosition();
    expect(position.top).toBe(100);
  });

  test('should respect reduced motion preferences', async () => {
    // Enable reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await helper.openPopup();
    await helper.addTallContent();

    // Scrolling should still work but without smooth animation
    await helper.scrollTo(200);

    // In reduced motion mode, scroll should be immediate
    const position = await helper.getScrollPosition();
    expect(position.top).toBe(200);
  });
});
