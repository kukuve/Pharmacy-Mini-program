module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/tests/**/*.test.js'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1'
  },
  modulePathIgnorePatterns: [
    '<rootDir>/uniCloud-aliyun/',
    '<rootDir>/uni_modules/'
  ],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(vue|vuex)/)'
  ],
  collectCoverageFrom: [
    'utils/**/*.js',
    'store/**/*.js',
    'cloudfunctions/**/index.js'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 40,
      lines: 25,
      statements: 25
    },
    './utils/': {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './store/': {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFiles: ['<rootDir>/tests/setup.js'],
  globals: {
    wx: {},
    uni: {}
  }
}
