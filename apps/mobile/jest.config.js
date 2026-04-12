module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '__tests__/helpers/',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|react-native-gesture-handler|react-native-reanimated|react-native-worklets|@react-native-async-storage|react-native-safe-area-context)/)',
  ],
};
