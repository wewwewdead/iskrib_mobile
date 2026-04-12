module.exports = {
  createWorklet: jest.fn(),
  runOnJS: jest.fn((fn) => fn),
  runOnUI: jest.fn((fn) => fn),
};
