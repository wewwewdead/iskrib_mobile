const path = require('path');

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: path.resolve(__dirname, '.env'),
        allowUndefined: true,
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
