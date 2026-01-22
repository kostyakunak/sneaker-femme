module.exports = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    testMatch: ['**/tests/job/**/*.test.ts'],
    moduleNameMapper: {
        '^@evershop/postgres-query-builder$': '<rootDir>/packages/postgres-query-builder/src/index.ts',
        '^@evershop/evershop/(.*)/services/index\\.js$': '<rootDir>/packages/evershop/src/modules/$1/services/index.ts',
        '^@evershop/evershop/lib/postgres/index\\.js$': '<rootDir>/packages/evershop/src/lib/postgres/index.ts',
        '^@evershop/evershop/lib/util/getConfig\\.js$': '<rootDir>/packages/evershop/src/lib/util/getConfig.ts',
        '^@evershop/evershop/extensions/([^/]+)/(.*)$': '<rootDir>/extensions/$1/src/$2',
        '^@evershop/evershop/lib/(.*)$': '<rootDir>/packages/evershop/src/lib/$1',
        '^@evershop/evershop/(auth|base|catalog|checkout|cms|cod|customer|graphql|oms|paypal|promotion|setting|stripe|tax)/(.*)$': '<rootDir>/packages/evershop/src/modules/$1/$2',
        '^@evershop/evershop/(.*)$': '<rootDir>/packages/evershop/src/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            useESM: true,
        }],
    },
    extensionsToTreatAsEsm: ['.ts']
};
