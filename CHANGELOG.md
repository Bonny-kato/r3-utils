# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.0.1](https://github.com/Bonny-kato/r3-utils/compare/v3.0.0...v2.0.1) (2025-05-21)

### Added

- `eslint.config.ts`: Created new ESLint configuration using flat config format with TypeScript support
- `qodana.yaml`: Added configuration for Qodana static code analysis

### Changed

- `src/hooks/useSubmitData.ts`: Updated to dynamically set `encType` based on data type
    - Uses "multipart/form-data" for FormData instances
    - Uses "application/json" for other data types
- `src/utils/query-params-utils.ts`: Improved type safety and simplification
    - Changed nullish value handling from `if (value)` to `if (value != null)`
    - Simplified `ParsedSearchParams` type by removing boolean and number types
- `tsconfig.node.json`: Added `eslint.config.ts` to "include" array

### Deprecated

- `src/utils/check-is-dev-mode.ts`: Marked for deprecation
    - Added documentation explaining package reliability issues
    - Provided direct copy usage instructions
    - Enhanced environment check implementation

## 1.1.0 (2025-04-09)


### Features

* add caching system and remove unused components ([e9fb8c3](https://github.com/Bonny-kato/r3-utils/commit/e9fb8c3d5b827d59f1800758833835de657ff97b))
* add commitlint, husky, lint-staged, and standard-version ([90738bd](https://github.com/Bonny-kato/r3-utils/commit/90738bde191ef4d996959a72faa5c8238cc81423))
* add documentation for core modules ([db0273e](https://github.com/Bonny-kato/r3-utils/commit/db0273e0a43d1099d1b50b02df324190c5e5d620))
* **auth, cache:** add modular auth system and cache refactor ([0727952](https://github.com/Bonny-kato/r3-utils/commit/07279523083feb131e27985403366096a9b787e9))
* initialize r3-utils project with base setup ([6b1d771](https://github.com/Bonny-kato/r3-utils/commit/6b1d771ed24751063838f99b330bee0710ec8f8e))
* update package metadata and release scripts ([f33ca3b](https://github.com/Bonny-kato/r3-utils/commit/f33ca3b2f373ccf045d1f9da29677aede30ce132))
* update package metadata and release scripts ([06e4d55](https://github.com/Bonny-kato/r3-utils/commit/06e4d55938790505fa5dceb41cc273f0be8aaeea))
