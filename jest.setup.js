// Mock window.api for renderer tests
global.window = {
  api: {
    storeGet: jest.fn(),
    storeSet: jest.fn(),
    openFiles: jest.fn(),
    openFolder: jest.fn(),
  },
};
