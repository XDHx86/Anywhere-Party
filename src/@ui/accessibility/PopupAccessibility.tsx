/**
 * Popup Accessibility Enhancement Component
 * Implements keyboard navigation, ARIA labels, and screen reader support
 * Requirements: 20.5, 25.5
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { Box } from '@mui/material';

// Types
export interface AccessibilityProps {
  children: React.ReactNode;
  announceChanges?: boolean;
  trapFocus?: boolean;
  autoFocus?: boolean;
}

export interface AccessibilityContextType {
  announceMessage: (message: string, priority?: 'polite' | 'assertive') => void;
  setFocusTrap: (enabled: boolean) => void;
  focusFirstElement: () => void;
  focusLastElement: () => void;
}

// Accessibility context
const AccessibilityContext = React.createContext<AccessibilityContextType | null>(null);

// Hook for using accessibility context
export const useAccessibility = () => {
  const context = React.useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

// Live region component for screen reader announcements
const LiveRegion: React.FC<{
  id: string;
  priority: 'polite' | 'assertive';
  message: string;
}> = ({ id, priority, message }) => (
  <div
    id={id}
    aria-live={priority}
    aria-atomic="true"
    style={{
      position: 'absolute',
      left: '-10000px',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
    }}
  >
    {message}
  </div>
);

// Focus trap utility
const useFocusTrap = (enabled: boolean, containerRef: React.RefObject<HTMLElement | null>) => {
  const firstFocusableRef = useRef<HTMLElement | null>(null);
  const lastFocusableRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
      '[role="button"]:not([disabled])',
      '[role="link"]:not([disabled])',
    ].join(', ');

    return Array.from(containerRef.current.querySelectorAll(focusableSelectors)) as HTMLElement[];
  }, [containerRef]);

  const updateFocusableElements = useCallback(() => {
    const elements = getFocusableElements();
    firstFocusableRef.current = elements[0] || null;
    lastFocusableRef.current = elements[elements.length - 1] || null;
  }, [getFocusableElements]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || event.key !== 'Tab') return;

      updateFocusableElements();

      const { current: firstElement } = firstFocusableRef;
      const { current: lastElement } = lastFocusableRef;

      if (!firstElement || !lastElement) return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [enabled, updateFocusableElements]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      updateFocusableElements();

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [enabled, handleKeyDown, updateFocusableElements]);

  return {
    focusFirst: () => firstFocusableRef.current?.focus(),
    focusLast: () => lastFocusableRef.current?.focus(),
  };
};

// Keyboard navigation hook
const useKeyboardNavigation = (containerRef: React.RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          // Close popup if supported
          if (window.close) {
            window.close();
          }
          break;

        case 'F6':
          // Cycle through main regions
          event.preventDefault();
          const regions = containerRef.current?.querySelectorAll(
            '[role="region"], [role="main"], header, nav, main, aside, footer'
          );
          if (regions && regions.length > 0) {
            const currentIndex = Array.from(regions).findIndex((region) =>
              region.contains(document.activeElement)
            );
            const nextIndex = (currentIndex + 1) % regions.length;
            const nextRegion = regions[nextIndex] as HTMLElement;

            // Focus first focusable element in region
            const focusable = nextRegion.querySelector(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            ) as HTMLElement;
            if (focusable) {
              focusable.focus();
            } else {
              nextRegion.focus();
            }
          }
          break;

        case 'Home':
          if (event.ctrlKey) {
            // Ctrl+Home: Focus first element
            event.preventDefault();
            const firstFocusable = containerRef.current?.querySelector(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            ) as HTMLElement;
            firstFocusable?.focus();
          }
          break;

        case 'End':
          if (event.ctrlKey) {
            // Ctrl+End: Focus last element
            event.preventDefault();
            const focusableElements = containerRef.current?.querySelectorAll(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusableElements && focusableElements.length > 0) {
              (focusableElements[focusableElements.length - 1] as HTMLElement).focus();
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [containerRef]);
};

// Main accessibility provider component
export const PopupAccessibility: React.FC<AccessibilityProps> = ({
  children,
  announceChanges = true,
  trapFocus = true,
  autoFocus = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [liveMessage, setLiveMessage] = React.useState('');
  const [livePriority, setLivePriority] = React.useState<'polite' | 'assertive'>('polite');
  const [focusTrapEnabled, setFocusTrapEnabled] = React.useState(trapFocus);

  // Initialize focus trap and keyboard navigation
  const { focusFirst, focusLast } = useFocusTrap(focusTrapEnabled, containerRef);
  useKeyboardNavigation(containerRef);

  // Auto-focus first element on mount
  useEffect(() => {
    if (autoFocus) {
      // Delay to ensure elements are rendered
      const timer = setTimeout(() => {
        focusFirst();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, focusFirst]);

  // Announce message function
  const announceMessage = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      if (!announceChanges) return;

      setLivePriority(priority);
      setLiveMessage(message);

      // Clear message after announcement
      setTimeout(() => setLiveMessage(''), 1000);
    },
    [announceChanges]
  );

  // Context value
  const contextValue: AccessibilityContextType = {
    announceMessage,
    setFocusTrap: setFocusTrapEnabled,
    focusFirstElement: focusFirst,
    focusLastElement: focusLast,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      <Box
        ref={containerRef}
        role="main"
        aria-label="Watch Party Extension Popup"
        sx={{
          width: '100%',
          height: '100%',
          position: 'relative',
          outline: 'none',
        }}
        tabIndex={-1}
      >
        {children}

        {/* Live regions for screen reader announcements */}
        <LiveRegion
          id="popup-live-region-polite"
          priority="polite"
          message={livePriority === 'polite' ? liveMessage : ''}
        />
        <LiveRegion
          id="popup-live-region-assertive"
          priority="assertive"
          message={livePriority === 'assertive' ? liveMessage : ''}
        />
      </Box>
    </AccessibilityContext.Provider>
  );
};

// Higher-order component for adding accessibility to any component
export const withAccessibility = <P extends object>(
  Component: React.ComponentType<P>,
  options?: Partial<AccessibilityProps>
) => {
  const AccessibleComponent = (props: P) => (
    <PopupAccessibility {...options}>
      <Component {...props} />
    </PopupAccessibility>
  );

  AccessibleComponent.displayName = `withAccessibility(${Component.displayName || Component.name})`;
  return AccessibleComponent;
};

// Hook for managing focus within a specific element
export const useFocusManagement = () => {
  const focusElement = useCallback((element: HTMLElement | null, options?: FocusOptions) => {
    if (element) {
      element.focus(options);
    }
  }, []);

  const focusById = useCallback(
    (id: string, options?: FocusOptions) => {
      const element = document.getElementById(id);
      focusElement(element, options);
    },
    [focusElement]
  );

  const focusNext = useCallback(() => {
    const focusableElements = document.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    );

    const currentIndex = Array.from(focusableElements).findIndex(
      (element) => element === document.activeElement
    );

    if (currentIndex >= 0 && currentIndex < focusableElements.length - 1) {
      (focusableElements[currentIndex + 1] as HTMLElement).focus();
    }
  }, []);

  const focusPrevious = useCallback(() => {
    const focusableElements = document.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    );

    const currentIndex = Array.from(focusableElements).findIndex(
      (element) => element === document.activeElement
    );

    if (currentIndex > 0) {
      (focusableElements[currentIndex - 1] as HTMLElement).focus();
    }
  }, []);

  return {
    focusElement,
    focusById,
    focusNext,
    focusPrevious,
  };
};

export default PopupAccessibility;
