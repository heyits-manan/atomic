import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    verbose: true,
    testTimeout: 15000,
    // uuid v13+ ships as pure ESM — tell Jest to transform it
    transformIgnorePatterns: [
        'node_modules/(?!uuid/)',
    ],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
        'node_modules/uuid/.+\\.js$': 'ts-jest',
    },
};

export default config;
