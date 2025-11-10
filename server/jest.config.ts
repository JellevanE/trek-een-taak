import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    roots: ['<rootDir>/__tests__'],
    testMatch: ['**/*.test.[tj]s'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json', useESM: true, diagnostics: { ignoreCodes: [151002] } }]
    }
};

export default config;
