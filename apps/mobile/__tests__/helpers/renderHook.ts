import React from 'react';
import renderer from 'react-test-renderer';

/**
 * Minimal renderHook helper for tests that don't have
 * @testing-library/react-native installed.
 *
 * Creates a tiny component that calls the hook, runs it through
 * react-test-renderer, and exposes the latest return value + unmount.
 */
export function renderHook<T>(hookFn: () => T): {
  result: {current: T};
  unmount: () => void;
  rerender: (newHookFn?: () => T) => void;
} {
  const resultRef: {current: T} = {} as {current: T};
  let currentHookFn = hookFn;

  function TestComponent() {
    resultRef.current = currentHookFn();
    return null;
  }

  let root: renderer.ReactTestRenderer;

  renderer.act(() => {
    root = renderer.create(React.createElement(TestComponent));
  });

  return {
    result: resultRef,
    unmount: () => {
      renderer.act(() => {
        root.unmount();
      });
    },
    rerender: (newHookFn?: () => T) => {
      if (newHookFn) {
        currentHookFn = newHookFn;
      }
      renderer.act(() => {
        root.update(React.createElement(TestComponent));
      });
    },
  };
}
