/**
 * Mock Browser Bridge for Testing
 * Provides mock implementations of browser APIs for unit tests
 */

type MockFunction = (...args: any[]) => any;

export interface MockBrowserBridge {
  storage: {
    local: {
      get: MockFunction;
      set: MockFunction;
      remove: MockFunction;
      clear: MockFunction;
    };
  };
  runtime: {
    sendMessage: MockFunction;
    onMessage: {
      addListener: MockFunction;
      removeListener: MockFunction;
    };
    id: string;
  };
  tabs: {
    query: MockFunction;
    sendMessage: MockFunction;
  };
  manifestVersion: number;
}

export function createMockBrowserBridge(): MockBrowserBridge {
  const mockFn =
    (returnValue: any = {}) =>
    (...args: any[]) =>
      Promise.resolve(returnValue);

  return {
    storage: {
      local: {
        get: mockFn({}),
        set: mockFn(undefined),
        remove: mockFn(undefined),
        clear: mockFn(undefined),
      },
    },
    runtime: {
      sendMessage: mockFn({ success: true }),
      onMessage: {
        addListener: () => {},
        removeListener: () => {},
      },
      id: 'mock-extension-id',
    },
    tabs: {
      query: mockFn([]),
      sendMessage: mockFn({ success: true }),
    },
    manifestVersion: 3,
  };
}
