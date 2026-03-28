module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(lucide-react|date-fns|date-fns-tz)/)',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '/config/',
    '/docs/',
  ],
  collectCoverageFrom: [
    '**/*.{js,jsx}',
    '!src/index.jsx',
    '!**/constants.{js,mjs}',
    '!**/*.config.{js,mjs}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/config/**',
    '!**/docs/**',
    '!**/shadcn/**',
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
}
