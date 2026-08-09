/**
 * Tests for KeyboardNavigation
 */

import { KeyboardNavigation } from './keyboard-navigation';

describe('KeyboardNavigation', () => {
  let container: HTMLElement;
  let keyboardNavigation: KeyboardNavigation;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    container.innerHTML = `
      <button id="btn1">Button 1</button>
      <input id="input1" type="text" />
      <select id="select1">
        <option>Option 1</option>
      </select>
      <textarea id="textarea1"></textarea>
      <a href="#" id="link1">Link 1</a>
      <div id="div1" tabindex="0">Focusable Div</div>
      <button id="btn2" disabled>Disabled Button</button>
      <button id="btn3" aria-hidden="true">Hidden Button</button>
    `;
    document.body.appendChild(container);

    keyboardNavigation = new KeyboardNavigation(container);
  });

  afterEach(() => {
    keyboardNavigation.destroy();
    document.body.innerHTML = '';
  });

  describe('initialization', () => {
    it('should identify focusable elements', () => {
      const focusableElements = keyboardNavigation.getFocusableElements();

      expect(focusableElements.length).toBeGreaterThan(0);

      // Should include enabled buttons, inputs, selects, textareas, links, and tabindex elements
      const elementIds = focusableElements.map((item) => item.element.id);
      expect(elementIds).toContain('btn1');
      expect(elementIds).toContain('input1');
      expect(elementIds).toContain('select1');
      expect(elementIds).toContain('textarea1');
      expect(elementIds).toContain('link1');
      expect(elementIds).toContain('div1');
    });

    it('should exclude disabled elements by default', () => {
      const focusableElements = keyboardNavigation.getFocusableElements();
      const elementIds = focusableElements.map((item) => item.element.id);

      expect(elementIds).not.toContain('btn2'); // disabled
    });

    it('should exclude hidden elements by default', () => {
      const focusableElements = keyboardNavigation.getFocusableElements();
      const elementIds = focusableElements.map((item) => item.element.id);

      expect(elementIds).not.toContain('btn3'); // aria-hidden
    });
  });

  describe('navigation options', () => {
    it('should include disabled elements when configured', () => {
      keyboardNavigation.destroy();
      keyboardNavigation = new KeyboardNavigation(container, { includeDisabled: true });

      const focusableElements = keyboardNavigation.getFocusableElements();
      const elementIds = focusableElements.map((item) => item.element.id);

      expect(elementIds).toContain('btn2'); // disabled but included
    });

    it('should use custom selector when provided', () => {
      keyboardNavigation.destroy();
      keyboardNavigation = new KeyboardNavigation(container, {
        customSelector: 'button:not([disabled])',
      });

      const focusableElements = keyboardNavigation.getFocusableElements();

      // Should only include enabled buttons
      expect(focusableElements.length).toBe(1);
      expect(focusableElements[0].element.id).toBe('btn1');
    });

    it('should update options', () => {
      keyboardNavigation.updateOptions({ includeDisabled: true });

      const focusableElements = keyboardNavigation.getFocusableElements();
      const elementIds = focusableElements.map((item) => item.element.id);

      expect(elementIds).toContain('btn2'); // now included
    });
  });

  describe('keyboard navigation', () => {
    beforeEach(() => {
      // Focus first element
      const firstElement = container.querySelector('#btn1') as HTMLElement;
      firstElement.focus();
    });

    it('should navigate to next element', () => {
      keyboardNavigation.navigateNext();

      // Should focus next element
      expect(document.activeElement?.id).toBe('input1');
    });

    it('should navigate to previous element', () => {
      // Focus second element first
      const secondElement = container.querySelector('#input1') as HTMLElement;
      secondElement.focus();

      keyboardNavigation.navigatePrevious();

      // Should focus previous element
      expect(document.activeElement?.id).toBe('btn1');
    });

    it('should wrap around when configured', () => {
      // Focus last element
      const lastElement = container.querySelector('#div1') as HTMLElement;
      lastElement.focus();

      keyboardNavigation.navigateNext();

      // Should wrap to first element
      expect(document.activeElement?.id).toBe('btn1');
    });

    it('should not wrap when configured', () => {
      keyboardNavigation.updateOptions({ wrap: false });

      // Focus last element
      const lastElement = container.querySelector('#div1') as HTMLElement;
      lastElement.focus();

      keyboardNavigation.navigateNext();

      // Should stay on last element
      expect(document.activeElement?.id).toBe('div1');
    });

    it('should navigate to first element', () => {
      // Focus middle element
      const middleElement = container.querySelector('#input1') as HTMLElement;
      middleElement.focus();

      keyboardNavigation.navigateFirst();

      expect(document.activeElement?.id).toBe('btn1');
    });

    it('should navigate to last element', () => {
      keyboardNavigation.navigateLast();

      expect(document.activeElement?.id).toBe('div1');
    });
  });

  describe('keyboard event handling', () => {
    it('should handle arrow key navigation', () => {
      const firstElement = container.querySelector('#btn1') as HTMLElement;
      firstElement.focus();

      const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      container.dispatchEvent(arrowDownEvent);

      // Should navigate to next element
      expect(document.activeElement?.id).toBe('input1');
    });

    it('should handle Home key', () => {
      const middleElement = container.querySelector('#input1') as HTMLElement;
      middleElement.focus();

      const homeEvent = new KeyboardEvent('keydown', { key: 'Home' });
      container.dispatchEvent(homeEvent);

      expect(document.activeElement?.id).toBe('btn1');
    });

    it('should handle End key', () => {
      const firstElement = container.querySelector('#btn1') as HTMLElement;
      firstElement.focus();

      const endEvent = new KeyboardEvent('keydown', { key: 'End' });
      container.dispatchEvent(endEvent);

      expect(document.activeElement?.id).toBe('div1');
    });

    it('should activate elements with Enter', () => {
      const button = container.querySelector('#btn1') as HTMLButtonElement;
      const clickSpy = jest.spyOn(button, 'click');
      button.focus();

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      container.dispatchEvent(enterEvent);

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should activate elements with Space', () => {
      const button = container.querySelector('#btn1') as HTMLButtonElement;
      const clickSpy = jest.spyOn(button, 'click');
      button.focus();

      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      container.dispatchEvent(spaceEvent);

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('element management', () => {
    it('should add element to navigation', () => {
      const newButton = document.createElement('button');
      newButton.id = 'newBtn';
      newButton.textContent = 'New Button';
      container.appendChild(newButton);

      keyboardNavigation.addElement(newButton);

      const focusableElements = keyboardNavigation.getFocusableElements();
      const elementIds = focusableElements.map((item) => item.element.id);
      expect(elementIds).toContain('newBtn');
    });

    it('should remove element from navigation', () => {
      const button = container.querySelector('#btn1') as HTMLElement;

      keyboardNavigation.removeElement(button);

      const focusableElements = keyboardNavigation.getFocusableElements();
      const elementIds = focusableElements.map((item) => item.element.id);
      expect(elementIds).not.toContain('btn1');
    });

    it('should focus element by selector', () => {
      const success = keyboardNavigation.focusElementBySelector('#input1');

      expect(success).toBe(true);
      expect(document.activeElement?.id).toBe('input1');
    });

    it('should fail to focus non-existent element', () => {
      const success = keyboardNavigation.focusElementBySelector('#nonexistent');

      expect(success).toBe(false);
    });
  });

  describe('navigation groups', () => {
    beforeEach(() => {
      // Add group attributes
      container.querySelector('#btn1')?.setAttribute('data-nav-group', 'buttons');
      container.querySelector('#input1')?.setAttribute('data-nav-group', 'inputs');
      container.querySelector('#select1')?.setAttribute('data-nav-group', 'inputs');
    });

    it('should navigate to group', () => {
      keyboardNavigation.navigateToGroup('inputs');

      // Should focus first element in inputs group
      const activeId = document.activeElement?.id;
      expect(activeId === 'input1' || activeId === 'select1').toBe(true);
    });

    it('should handle non-existent group', () => {
      const currentFocus = document.activeElement;

      keyboardNavigation.navigateToGroup('nonexistent');

      // Focus should not change
      expect(document.activeElement).toBe(currentFocus);
    });
  });

  describe('roving tabindex', () => {
    it('should enable roving tabindex', () => {
      keyboardNavigation.enableRovingTabindex();

      const focusableElements = keyboardNavigation.getFocusableElements();

      // First element should have tabindex="0"
      expect(focusableElements[0].element.getAttribute('tabindex')).toBe('0');

      // Other elements should have tabindex="-1"
      for (let i = 1; i < focusableElements.length; i++) {
        expect(focusableElements[i].element.getAttribute('tabindex')).toBe('-1');
      }
    });

    it('should disable roving tabindex', () => {
      keyboardNavigation.enableRovingTabindex();
      keyboardNavigation.disableRovingTabindex();

      const focusableElements = keyboardNavigation.getFocusableElements();

      // All elements should have tabindex removed
      focusableElements.forEach((item) => {
        expect(item.element.hasAttribute('tabindex')).toBe(false);
      });
    });
  });

  describe('skip links', () => {
    it('should create skip links', () => {
      const targets = [
        { label: 'Skip to main content', selector: '#main' },
        { label: 'Skip to navigation', selector: '#nav' },
      ];

      const skipLinks = keyboardNavigation.createSkipLinks(targets);

      expect(skipLinks.className).toBe('skip-links');
      expect(skipLinks.children.length).toBe(2);

      const firstLink = skipLinks.children[0] as HTMLAnchorElement;
      expect(firstLink.textContent).toBe('Skip to main content');
      expect(firstLink.className).toBe('skip-link');
    });
  });

  describe('dynamic content', () => {
    it('should update when DOM changes', (done) => {
      const initialCount = keyboardNavigation.getFocusableElements().length;

      // Add new focusable element
      const newButton = document.createElement('button');
      newButton.textContent = 'Dynamic Button';
      container.appendChild(newButton);

      // Wait for MutationObserver to trigger
      setTimeout(() => {
        const newCount = keyboardNavigation.getFocusableElements().length;
        expect(newCount).toBe(initialCount + 1);
        done();
      }, 100);
    });
  });

  describe('current element tracking', () => {
    it('should track current focused element', () => {
      const button = container.querySelector('#btn1') as HTMLElement;
      button.focus();

      // Trigger focusin event
      const focusEvent = new FocusEvent('focusin', { target: button } as unknown as FocusEventInit);
      container.dispatchEvent(focusEvent);

      const currentElement = keyboardNavigation.getCurrentElement();
      expect(currentElement?.id).toBe('btn1');
    });

    it('should return null when no element is focused', () => {
      const currentElement = keyboardNavigation.getCurrentElement();
      expect(currentElement).toBe(null);
    });
  });

  describe('cleanup', () => {
    it('should clean up event listeners on destroy', () => {
      const removeEventListenerSpy = jest.spyOn(container, 'removeEventListener');

      keyboardNavigation.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalled();
    });

    it('should clear focusable elements on destroy', () => {
      keyboardNavigation.destroy();

      const focusableElements = keyboardNavigation.getFocusableElements();
      expect(focusableElements.length).toBe(0);
    });
  });
});
