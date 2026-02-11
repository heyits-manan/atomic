import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    verbose: true,
    // Increase timeout for integration tests that hit Postgres
    testTimeout: 15000,
};

export default config;
