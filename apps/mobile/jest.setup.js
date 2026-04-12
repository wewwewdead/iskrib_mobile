/* eslint-env jest */
require('react-native-gesture-handler/jestSetup');

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key) => Promise.resolve(store[key] ?? null)),
      setItem: jest.fn((key, value) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach((k) => delete store[k]);
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
      multiGet: jest.fn((keys) =>
        Promise.resolve(keys.map((k) => [k, store[k] ?? null])),
      ),
      multiSet: jest.fn((pairs) => {
        pairs.forEach(([k, v]) => { store[k] = v; });
        return Promise.resolve();
      }),
      multiRemove: jest.fn((keys) => {
        keys.forEach((k) => delete store[k]);
        return Promise.resolve();
      }),
    },
  };
});

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native-safe-area-context', () => {
  return {
    SafeAreaProvider: ({children}) => children,
    SafeAreaView: ({children}) => children,
    useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
  };
});

jest.mock('react-native-image-crop-picker', () => ({
  __esModule: true,
  default: {
    openPicker: jest.fn(),
    openCropper: jest.fn(),
    openCamera: jest.fn(),
    clean: jest.fn(),
    cleanSingle: jest.fn(),
  },
}));
