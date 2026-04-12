module.exports = {
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  wrap: (component) => component,
  setUser: jest.fn(),
  setTag: jest.fn(),
  setExtra: jest.fn(),
  withScope: jest.fn((cb) => cb({setTag: jest.fn(), setExtra: jest.fn()})),
};
