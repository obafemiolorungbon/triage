const { readFileSync } = require('fs');
const { join } = require('path');

const swcJestConfig = JSON.parse(
  readFileSync(join(__dirname, '.spec.swcrc'), 'utf-8'),
);
swcJestConfig.swcrc = false;

/** @type {import('jest').Config} */
module.exports = {
  displayName: 'backend',
  testEnvironment: 'node',
  resolver: '@nx/jest/plugins/resolver',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  setupFiles: ['<rootDir>/src/test/reflect-polyfill.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  coverageDirectory: '../../coverage/apps/backend',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/test/**',
    '!src/main.ts',
    '!src/worker-bootstrap.ts',
    '!src/auth.ts',
    '!src/scripts/**',
    '!src/**/*.module.ts',
    '!src/queue/bull-board.ts',
    '!src/triage/triage-worker.module.ts',
    '!src/tenants/**',
    '!src/analytics/**',
    '!src/integrations/**',
    '!src/notifications/**',
    '!src/notification/**',
    '!src/**/*.spec.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@triage/shared-types$':
      '<rootDir>/../../libs/shared-types/src/index.ts',
    '^@triage/db$': '<rootDir>/../../libs/db/src/index.ts',
  },
};
