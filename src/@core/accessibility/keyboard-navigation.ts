/**
 * Keyboard Navigation Helper
 *
 * Provides enhanced keyboard navigation for UI elements
 */

export interface NavigationOptions {
  wrap: boolean;
  skipHidden: boolean;
  includeDisabled: boolean;
  customSelector?: string;
}

export interface FocusableElement {
  element: HTMLElement;
  index: number;
  group?: string;
}

export class KeyboardNavigation {
  private container: HTMLElement;
  private focusableElements: FocusableElement[] = [];
  private currentIndex = -1;
  private options: NavigationOptions;
  private observer: MutationObserver | null = null;

  constructor(container: HTMLElement, options: Partial<NavigationOptions> = {}) {
    this.container = container;
    this.options = {
      wrap: true,
      skipHidden: true,
      includeDisabled: false,
      ...options,
    };

    this.init();
  }

  /**
   * Initialize keyboard navigation
   */
  private init(): void {
    this.updateFocusableElements();
    this.attachEventListeners();
    this.observeChanges();
  }

  /**
   * Get default focusable selector
   */
  private getDefaultSelector(): string {
    const selectors = [
      'button:not([tabindex="-1"])',
      'input:not([tabindex="-1"])',
      'select:not([tabindex="-1"])',
      'textarea:not([tabindex="-1"])',
      'a[href]:not([tabindex="-1"])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([tabindex="-1"])',
      '[role="tab"]:not([tabindex="-1"])',
      '[role="menuitem"]:not([tabindex="-1"])',
      '[role="option"]:not([tabindex="-1"])',
      '[contenteditable="true"]:not([tabindex="-1"])',
    ];

    if (!this.options.includeDisabled) {
      return selectors
        .map((s) =>
          s.replace(
            ':not([tabindex="-1"])',
            ':not([disabled]):not([aria-disabled="true"]):not([tabindex="-1"])'
          )
        )
        .join(', ');
    }

    return selectors.join(', ');
  }

  /**
   * Update focusable elements list
   */
  private updateFocusableElements(): void {
    const selector = this.options.customSelector || this.getDefaultSelector();
    const elements = Array.from(this.container.querySelectorAll(selector)) as HTMLElement[];

    this.focusableElements = elements
      .filter((el) => this.isElementFocusable(el))
      .map((element, index) => ({
        element,
        index,
        group: element.getAttribute('data-nav-group') || undefined,
      }));
  }

  /**
   * Check if element is focusable
   */
  private isElementFocusable(element: HTMLElement): boolean {
    // Skip hidden elements if option is set
    if (this.options.skipHidden && !this.isVisible(element)) {
      return false;
    }

    // Skip disabled elements if option is set
    if (!this.options.includeDisabled) {
      if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') {
        return false;
      }
    }

    // Skip elements with aria-hidden
    if (element.getAttribute('aria-hidden') === 'true') {
      return false;
    }

    return true;
  }

  /**
   * Check if element is visible
   */
  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      element.offsetParent !== null
    );
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    this.container.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.container.addEventListener('focusin', this.handleFocusIn.bind(this));
  }

  /**
   * Observe DOM changes
   */
  private observeChanges(): void {
    this.observer = new MutationObserver(() => {
      this.updateFocusableElements();
    });

    this.observer.observe(this.container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled', 'aria-hidden', 'tabindex', 'style', 'class'],
    });
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Tab':
        this.handleTabNavigation(event);
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        this.navigateNext();
        event.preventDefault();
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        this.navigatePrevious();
        event.preventDefault();
        break;
      case 'Home':
        this.navigateFirst();
        event.preventDefault();
        break;
      case 'End':
        this.navigateLast();
        event.preventDefault();
        break;
      case 'Enter':
      case ' ':
        this.activateCurrentElement(event);
        break;
    }
  }

  /**
   * Handle tab navigation
   */
  private handleTabNavigation(event: KeyboardEvent): void {
    if (event.shiftKey) {
      this.navigatePrevious();
    } else {
      this.navigateNext();
    }
    event.preventDefault();
  }

  /**
   * Handle focus events
   */
  private handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    const focusableIndex = this.focusableElements.findIndex((item) => item.element === target);

    if (focusableIndex !== -1) {
      this.currentIndex = focusableIndex;
    }
  }

  /**
   * Navigate to next element
   */
  public navigateNext(): void {
    if (this.focusableElements.length === 0) return;

    let nextIndex = this.currentIndex + 1;

    if (nextIndex >= this.focusableElements.length) {
      nextIndex = this.options.wrap ? 0 : this.focusableElements.length - 1;
    }

    this.focusElement(nextIndex);
  }

  /**
   * Navigate to previous element
   */
  public navigatePrevious(): void {
    if (this.focusableElements.length === 0) return;

    let prevIndex = this.currentIndex - 1;

    if (prevIndex < 0) {
      prevIndex = this.options.wrap ? this.focusableElements.length - 1 : 0;
    }

    this.focusElement(prevIndex);
  }

  /**
   * Navigate to first element
   */
  public navigateFirst(): void {
    if (this.focusableElements.length > 0) {
      this.focusElement(0);
    }
  }

  /**
   * Navigate to last element
   */
  public navigateLast(): void {
    if (this.focusableElements.length > 0) {
      this.focusElement(this.focusableElements.length - 1);
    }
  }

  /**
   * Navigate to element by group
   */
  public navigateToGroup(groupName: string): void {
    const groupElement = this.focusableElements.find((item) => item.group === groupName);
    if (groupElement) {
      this.focusElement(groupElement.index);
    }
  }

  /**
   * Focus element at index
   */
  private focusElement(index: number): void {
    if (index < 0 || index >= this.focusableElements.length) return;

    const focusableItem = this.focusableElements[index];
    this.currentIndex = index;
    focusableItem.element.focus();

    // Scroll into view if needed
    focusableItem.element.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }

  /**
   * Activate current element
   */
  private activateCurrentElement(event: KeyboardEvent): void {
    if (this.currentIndex === -1) return;

    const currentElement = this.focusableElements[this.currentIndex]?.element;
    if (!currentElement) return;

    // Prevent default for space key on buttons to avoid scrolling
    if (
      event.key === ' ' &&
      (currentElement.tagName === 'BUTTON' || currentElement.getAttribute('role') === 'button')
    ) {
      event.preventDefault();
    }

    this.activateElement(currentElement);
  }

  /**
   * Activate element
   */
  private activateElement(element: HTMLElement): void {
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');

    switch (tagName) {
      case 'button':
        element.click();
        break;
      case 'a':
        if (element.hasAttribute('href')) {
          element.click();
        }
        break;
      case 'input':
        const input = element as HTMLInputElement;
        if (input.type === 'checkbox' || input.type === 'radio') {
          input.click();
        } else {
          input.focus();
        }
        break;
      case 'select':
        // Open select dropdown
        const select = element as HTMLSelectElement;
        select.focus();
        // Simulate click to open dropdown
        const event = new MouseEvent('mousedown', { bubbles: true });
        select.dispatchEvent(event);
        break;
      default:
        if (role === 'button' || role === 'tab' || role === 'menuitem' || role === 'option') {
          element.click();
        }
        break;
    }
  }

  /**
   * Get current focused element
   */
  public getCurrentElement(): HTMLElement | null {
    if (this.currentIndex === -1) return null;
    return this.focusableElements[this.currentIndex]?.element || null;
  }

  /**
   * Get all focusable elements
   */
  public getFocusableElements(): FocusableElement[] {
    return [...this.focusableElements];
  }

  /**
   * Set focus to specific element
   */
  public focusElementBySelector(selector: string): boolean {
    const element = this.container.querySelector(selector) as HTMLElement;
    if (!element) return false;

    const index = this.focusableElements.findIndex((item) => item.element === element);
    if (index !== -1) {
      this.focusElement(index);
      return true;
    }

    return false;
  }

  /**
   * Add element to navigation
   */
  public addElement(element: HTMLElement, group?: string): void {
    if (!this.isElementFocusable(element)) return;

    const focusableItem: FocusableElement = {
      element,
      index: this.focusableElements.length,
      group,
    };

    this.focusableElements.push(focusableItem);
    this.reindexElements();
  }

  /**
   * Remove element from navigation
   */
  public removeElement(element: HTMLElement): void {
    const index = this.focusableElements.findIndex((item) => item.element === element);
    if (index !== -1) {
      this.focusableElements.splice(index, 1);
      this.reindexElements();

      // Adjust current index if needed
      if (this.currentIndex >= index) {
        this.currentIndex = Math.max(0, this.currentIndex - 1);
      }
    }
  }

  /**
   * Reindex elements
   */
  private reindexElements(): void {
    this.focusableElements.forEach((item, index) => {
      item.index = index;
    });
  }

  /**
   * Update options
   */
  public updateOptions(newOptions: Partial<NavigationOptions>): void {
    this.options = { ...this.options, ...newOptions };
    this.updateFocusableElements();
  }

  /**
   * Create roving tabindex navigation
   */
  public enableRovingTabindex(): void {
    // Set all elements to tabindex="-1" except the first one
    this.focusableElements.forEach((item, index) => {
      item.element.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });

    // Update tabindex when focus changes
    this.container.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      const focusedIndex = this.focusableElements.findIndex((item) => item.element === target);

      if (focusedIndex !== -1) {
        // Remove tabindex from all elements
        this.focusableElements.forEach((item) => {
          item.element.setAttribute('tabindex', '-1');
        });

        // Set tabindex on focused element
        target.setAttribute('tabindex', '0');
        this.currentIndex = focusedIndex;
      }
    });
  }

  /**
   * Disable roving tabindex
   */
  public disableRovingTabindex(): void {
    this.focusableElements.forEach((item) => {
      item.element.removeAttribute('tabindex');
    });
  }

  /**
   * Create skip links
   */
  public createSkipLinks(targets: { label: string; selector: string }[]): HTMLElement {
    const skipContainer = document.createElement('div');
    skipContainer.className = 'skip-links';
    skipContainer.setAttribute('aria-label', 'Skip navigation links');

    targets.forEach((target) => {
      const skipLink = document.createElement('a');
      skipLink.href = '#';
      skipLink.className = 'skip-link';
      skipLink.textContent = target.label;
      skipLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.focusElementBySelector(target.selector);
      });
      skipContainer.appendChild(skipLink);
    });

    return skipContainer;
  }

  /**
   * Destroy keyboard navigation
   */
  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.container.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.container.removeEventListener('focusin', this.handleFocusIn.bind(this));

    this.focusableElements = [];
    this.currentIndex = -1;
  }
}
