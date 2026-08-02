/**
 * Accessibility Module
 *
 * Main entry point for accessibility features
 */

import { AccessibilityManager } from './accessibility-manager';
import { CaptionStyler } from './caption-styler';

export {
  AccessibilityManager,
  type AccessibilitySettings,
  type KeyboardShortcut,
} from './accessibility-manager';
export { CaptionStyler, type CaptionStyle, type CaptionPreset } from './caption-styler';
export {
  KeyboardNavigation,
  type NavigationOptions,
  type FocusableElement,
} from './keyboard-navigation';

// Import styles
import './accessibility-styles.css';

/**
 * Initialize accessibility features for the extension
 */
export function initializeAccessibility(): AccessibilityManager {
  const accessibilityManager = new AccessibilityManager();

  // Load saved caption styles
  const captionStyler = new CaptionStyler();
  captionStyler.loadSavedStyle();

  // Add accessibility shortcuts
  accessibilityManager.addShortcut({
    key: 's',
    altKey: true,
    action: 'toggle-captions',
    description: 'Toggle caption styling',
  });

  accessibilityManager.addShortcut({
    key: 'k',
    altKey: true,
    action: 'show-shortcuts',
    description: 'Show keyboard shortcuts',
  });

  // Announce initialization
  accessibilityManager.announce('Accessibility features initialized');

  return accessibilityManager;
}

/**
 * Make an element accessible with common patterns
 */
export function makeAccessible(
  element: HTMLElement,
  options: {
    label?: string;
    description?: string;
    role?: string;
    shortcuts?: string[];
    group?: string;
  }
): void {
  // Set ARIA label
  if (options.label) {
    element.setAttribute('aria-label', options.label);
  }

  // Set ARIA description
  if (options.description) {
    const descId = `desc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const descElement = document.createElement('div');
    descElement.id = descId;
    descElement.className = 'sr-only';
    descElement.textContent = options.description;
    element.appendChild(descElement);
    element.setAttribute('aria-describedby', descId);
  }

  // Set role
  if (options.role) {
    element.setAttribute('role', options.role);
  }

  // Set navigation group
  if (options.group) {
    element.setAttribute('data-nav-group', options.group);
  }

  // Add keyboard shortcuts to title
  if (options.shortcuts && options.shortcuts.length > 0) {
    const currentTitle = element.getAttribute('title') || '';
    const shortcutText = ` (${options.shortcuts.join(', ')})`;
    element.setAttribute('title', currentTitle + shortcutText);
  }

  // Ensure focusable
  if (
    !element.hasAttribute('tabindex') &&
    !['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(element.tagName)
  ) {
    element.setAttribute('tabindex', '0');
  }
}

/**
 * Create accessible button with proper ARIA attributes
 */
export function createAccessibleButton(
  text: string,
  onClick: () => void,
  options: {
    description?: string;
    shortcut?: string;
    className?: string;
    disabled?: boolean;
    pressed?: boolean;
    expanded?: boolean;
  } = {}
): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = text;
  button.className = options.className || '';

  // Set ARIA label with description
  if (options.description) {
    button.setAttribute('aria-label', `${text}. ${options.description}`);
  }

  // Set keyboard shortcut in title
  if (options.shortcut) {
    button.setAttribute('title', `${text} (${options.shortcut})`);
  }

  // Set ARIA states
  if (options.pressed !== undefined) {
    button.setAttribute('aria-pressed', options.pressed.toString());
  }

  if (options.expanded !== undefined) {
    button.setAttribute('aria-expanded', options.expanded.toString());
  }

  // Set disabled state
  if (options.disabled) {
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
  }

  // Add click handler
  button.addEventListener('click', onClick);

  return button;
}

/**
 * Create accessible form field with proper labeling
 */
export function createAccessibleFormField(
  type: 'input' | 'select' | 'textarea',
  label: string,
  options: {
    id?: string;
    placeholder?: string;
    required?: boolean;
    helpText?: string;
    errorText?: string;
    value?: string;
    selectOptions?: { value: string; text: string }[];
  } = {}
): { container: HTMLElement; field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement } {
  const container = document.createElement('div');
  container.className = 'form-group';

  const id = options.id || `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Create label
  const labelElement = document.createElement('label');
  labelElement.setAttribute('for', id);
  labelElement.textContent = label;
  if (options.required) {
    labelElement.innerHTML += ' <span aria-label="required">*</span>';
  }
  container.appendChild(labelElement);

  // Create field
  let field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

  if (type === 'select') {
    field = document.createElement('select');
    if (options.selectOptions) {
      options.selectOptions.forEach((option) => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        field.appendChild(optionElement);
      });
    }
  } else if (type === 'textarea') {
    field = document.createElement('textarea');
  } else {
    field = document.createElement('input');
    (field as HTMLInputElement).type = type;
  }

  field.id = id;

  if (options.placeholder) {
    field.setAttribute('placeholder', options.placeholder);
  }

  if (options.required) {
    field.setAttribute('required', '');
    field.setAttribute('aria-required', 'true');
  }

  if (options.value) {
    field.value = options.value;
  }

  container.appendChild(field);

  // Add help text
  if (options.helpText) {
    const helpId = `${id}-help`;
    const helpElement = document.createElement('div');
    helpElement.id = helpId;
    helpElement.className = 'help-text';
    helpElement.textContent = options.helpText;
    container.appendChild(helpElement);
    field.setAttribute('aria-describedby', helpId);
  }

  // Add error text
  if (options.errorText) {
    const errorId = `${id}-error`;
    const errorElement = document.createElement('div');
    errorElement.id = errorId;
    errorElement.className = 'error-text';
    errorElement.textContent = options.errorText;
    errorElement.setAttribute('role', 'alert');
    container.appendChild(errorElement);

    const describedBy = field.getAttribute('aria-describedby');
    field.setAttribute('aria-describedby', describedBy ? `${describedBy} ${errorId}` : errorId);
    field.setAttribute('aria-invalid', 'true');
    container.classList.add('error');
  }

  return { container, field };
}

/**
 * Create accessible modal dialog
 */
export function createAccessibleModal(
  title: string,
  content: string | HTMLElement,
  options: {
    closable?: boolean;
    className?: string;
    onClose?: () => void;
  } = {}
): HTMLElement {
  const modal = document.createElement('div');
  modal.className = `modal ${options.className || ''}`;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'modal-title');

  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';

  const modalHeader = document.createElement('div');
  modalHeader.className = 'modal-header';

  const modalTitle = document.createElement('h2');
  modalTitle.id = 'modal-title';
  modalTitle.textContent = title;
  modalHeader.appendChild(modalTitle);

  if (options.closable !== false) {
    const closeButton = createAccessibleButton(
      '×',
      () => {
        modal.remove();
        options.onClose?.();
      },
      {
        className: 'modal-close',
        description: 'Close modal',
      }
    );
    modalHeader.appendChild(closeButton);
  }

  modalContent.appendChild(modalHeader);

  const modalBody = document.createElement('div');
  modalBody.className = 'modal-body';

  if (typeof content === 'string') {
    modalBody.innerHTML = content;
  } else {
    modalBody.appendChild(content);
  }

  modalContent.appendChild(modalBody);
  modal.appendChild(modalContent);

  // Handle escape key
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && options.closable !== false) {
      modal.remove();
      options.onClose?.();
    }
  });

  // Focus management
  const focusableElements = modal.querySelectorAll(
    'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
  );
  if (focusableElements.length > 0) {
    (focusableElements[0] as HTMLElement).focus();
  }

  return modal;
}

/**
 * Create accessible status indicator
 */
export function createStatusIndicator(
  status: 'connected' | 'disconnected' | 'connecting' | 'error',
  message: string
): HTMLElement {
  const indicator = document.createElement('div');
  indicator.className = `status ${status}`;
  indicator.setAttribute('role', 'status');
  indicator.setAttribute('aria-live', 'polite');

  const statusText = document.createElement('span');
  statusText.className = 'sr-only';
  statusText.textContent = `Status: ${status}. ${message}`;
  indicator.appendChild(statusText);

  const visibleText = document.createElement('span');
  visibleText.textContent = message;
  indicator.appendChild(visibleText);

  return indicator;
}

/**
 * Create accessible progress bar
 */
export function createProgressBar(value: number, max: number = 100, label?: string): HTMLElement {
  const progressContainer = document.createElement('div');
  progressContainer.className = 'progress-container';

  if (label) {
    const labelElement = document.createElement('div');
    labelElement.className = 'progress-label';
    labelElement.textContent = label;
    progressContainer.appendChild(labelElement);
  }

  const progressBar = document.createElement('div');
  progressBar.setAttribute('role', 'progressbar');
  progressBar.setAttribute('aria-valuenow', value.toString());
  progressBar.setAttribute('aria-valuemin', '0');
  progressBar.setAttribute('aria-valuemax', max.toString());
  progressBar.setAttribute('aria-label', label || 'Progress');
  progressBar.style.setProperty('--progress', `${(value / max) * 100}%`);

  progressContainer.appendChild(progressBar);

  return progressContainer;
}

/**
 * Announce message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcer = document.querySelector('[aria-live]') as HTMLElement;
  if (announcer) {
    announcer.setAttribute('aria-live', priority);
    announcer.textContent = message;
  } else {
    // Create temporary announcer
    const tempAnnouncer = document.createElement('div');
    tempAnnouncer.setAttribute('aria-live', priority);
    tempAnnouncer.className = 'sr-only';
    tempAnnouncer.textContent = message;
    document.body.appendChild(tempAnnouncer);

    setTimeout(() => {
      tempAnnouncer.remove();
    }, 1000);
  }
}
