module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/renderer/src/index.tsx',
    '!src/main/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 4,
      functions: 5,
      lines: 5,
      statements: 5
    }
  },
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@renderer/(.*)$': '<rootDir>/src/renderer/src/$1'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        target: 'ES2022',
        jsx: 'react-jsx',
        resolveJsonModule: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        baseUrl: '.',
        paths: {
          '@shared/*': ['src/shared/*'],
          '@renderer/*': ['src/renderer/src/*']
        }
      }
    }]
  }
}
