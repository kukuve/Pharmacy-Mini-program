// Test setup file - Global mocks for WeChat Mini Program and UniApp APIs

// Mock wx global object
global.wx = {
  cloud: {
    init: jest.fn(),
    callFunction: jest.fn(),
    database: jest.fn(),
    uploadFile: jest.fn(),
    downloadFile: jest.fn(),
    getTempFileURL: jest.fn(),
    deleteFile: jest.fn()
  },
  getStorageSync: jest.fn(() => null),
  setStorageSync: jest.fn(),
  removeStorageSync: jest.fn(),
  navigateTo: jest.fn(),
  switchTab: jest.fn(),
  navigateBack: jest.fn(),
  showToast: jest.fn(),
  showModal: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  pageScrollTo: jest.fn(),
  stopPullDownRefresh: jest.fn(),
  canIUse: jest.fn(() => true),
  getUpdateManager: jest.fn(() => ({
    onCheckForUpdate: jest.fn(),
    onUpdateReady: jest.fn(),
    onUpdateFailed: jest.fn(),
    applyUpdate: jest.fn()
  })),
  login: jest.fn(() => Promise.resolve({ code: 'mock_code' })),
  getSetting: jest.fn(() => Promise.resolve({
    authSetting: { 'scope.userInfo': true }
  })),
  authorize: jest.fn(() => Promise.resolve({
    authSetting: { 'scope.userInfo': true }
  })),
  getUserInfo: jest.fn(() => Promise.resolve({
    userInfo: { nickName: 'Test User', avatarUrl: 'https://example.com/avatar.png' }
  }))
}

// Mock uni global object
global.uni = {
  ...global.wx,
  getStorageSync: jest.fn(() => null),
  setStorageSync: jest.fn(),
  removeStorageSync: jest.fn()
}

// Mock CloudBase cloud function response helper
global.mockCloudResponse = (success = true, data = null, error = null) => ({
  result: success
    ? { success: true, data }
    : { success: false, error: error || 'Mock error' }
})

// Reset all mocks before each test
// NOTE: Jest setupFiles does not have access to beforeEach/describe.
// Individual test files should call resetMocks() in their own beforeEach.
global.resetMocks = () => {
  jest.clearAllMocks()
  global.wx.cloud.callFunction.mockResolvedValue(global.mockCloudResponse())
  global.wx.cloud.database.mockReturnValue({
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    field: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ data: [] }),
    add: jest.fn().mockResolvedValue({ _id: 'mock_id' }),
    update: jest.fn().mockResolvedValue({ stats: { updated: 1 } }),
    remove: jest.fn().mockResolvedValue({ stats: { removed: 1 } }),
    count: jest.fn().mockResolvedValue({ total: 0 }),
    aggregate: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    group: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    end: jest.fn().mockResolvedValue({ list: [] })
  })
}
