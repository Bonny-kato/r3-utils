# Changelog

All notable changes to this project will be documented in this file.

## [v2.3.5-beta.7](https://github.com/Bonny-kato/r3-utils/tree/v2.3.5-beta.7) (2025-11-23)

### What's new

**Access Control Module**

- Introduced `createAccessControl<TUser>()` factory to generate type-safe hooks, components, and helpers bound to your
  app-specific user type. This includes typed variants of `AccessControl`, `AccessControlProvider`, `useHasAccess`,
  `useAccessControl`, `requireAccess`, `checkAccess`, `generateMenuAccess`, and `generateUserAccessControlConfig`.
- Added attribute access's predicate function for dynamic attribute checks.
  ```ts
  // Plain attribute (exact match)
  attributes: { department: 'engineering' }

  // Criteria with options
  attributes: { criteria: { isActive: true }, requireAll: true }

  // Predicate function (full control)
  attributes: (user) => user.age >= 18
  ```

### What's changed

**Access Control Module**

- Deprecated the global `strictness` configuration in favor of granular, per-requirement options via `requireAll` and
  `not` within roles, permissions, and attributes definitions. The simple array form remains supported for backward
  compatibility.
  ```ts
  const user: AppUser = {
        id: '123',
        roles: [{ name: 'EDITOR', permissions: ['read:posts', 'write:posts'] }],
        department: 'content'
  };

  const requiredAccess: UserAccessControl<AppUser> = {
    roles: ['editor'],
    permissions: ['write:posts']
  };
    // old way
  const hasAccess = checkAccess(user, requiredAccess, { 
    // passsing strictness as a global config is deprecated
    attributes:true,
    permissions:true,
    roles:true,
  });
  
  // New Way
  const newRequiredAccess: UserAccessControl<AppUser> = {
    permissions: {list: ["edit:users", "edit:posts"], requireAll:true},
    role: {list: ["editor", "admin"], not: true} // negate role check meaning grant access if user is not an admin or editor
  };
    
  const hasAccess2 = checkAccess(user,newRequiredAccess)
  ```
  With the new approach, you can now localize the strictness of each requirement independently but also you can negate
  the requirement meaning grant access if the user does not have the required permission or role.
  <hr/>
- Updated `hasRole`, `hasPermission`, and `hasAttribute` helpers to support the new per-requirement options and
  normalized evaluation.
- Implemented deep attribute comparison for attribute-based checks, improving correctness when validating nested
  objects.
- Added schema validation to `generateUserAccessControlConfig` to ensure that the provided user object is valid.

**Utilities**

- Improved `isNotEmpty` utility to narrow types correctly (`value is NonNullable<T>`), enhancing type safety across the
  codebase.
- Added `isEmpty` utility to complement `isNotEmpty`, providing a type-safe way to check for emptiness.

### Dependencies

- Upgraded `axios` to the latest version (now `^1.13.2`).

### Docs, tests, and chores

- Added project development guidelines for the Junie JetBrains agent.
- Renamed `src/http-client/__tests__` to `src/http-client/tests` for consistency.
- Added browser-based tests and test utilities for access control.

## [v2.3.5-beta.6](https://github.com/Bonny-kato/r3-utils/tree/v2.3.5-beta.6) (2025-10-28)

### What's fixed

- Fixed the issue of permissions and roles matching due to case transformation that was being done in `hasPermission`
  and `hasRole`

## [v2.3.5-beta.5](https://github.com/Bonny-kato/r3-utils/tree/v2.3.5-beta.5) (2025-10-27)

### What's fixed

- Addressed the issue where some modules were unexpectedly stripped out due to how tsup handles tree-shaking when
  provided with an array of configs

- Added new test files to validate the build output

## [v2.3.5-beta.2](https://github.com/Bonny-kato/r3-utils/tree/v2.3.5-beta.2) (2025-10-23)

### What's fixed

**Access Control Module**

- Addressed the issue where permissions and roles in capital letters caused checks to fail. By default, configured
  permissions were converted to lowercase. This issue was fixed by removing the conversion and storing permissions and
  roles as-is, making behavior more predictable. This also works better with custom GenerateAccessControlConfigFunc
  where consumers can decide when to convert permissions and roles.
- Fixed type issue in `AccessControl` component where the `permission`, `role`, and `attribute` props were marked as
  non-existent.

## [v2.3.5-beta.1](https://github.com/Bonny-kato/r3-utils/tree/v2.3.5-beta.1) (2025-10-13)

### What's fixed

**Http Module**

- Address the issue where HTTP status codes were not being exported due to tree shaking during build

## [v2.3.5-beta.0](https://github.com/Bonny-kato/r3-utils/compare/v3.0.0...v2.0.1) (2025-10-13)

### What's new

**Utilities Module**

- Upgraded the `tryCatch` utility to support both async and sync inputs

**Auth Module**

- Added support for both single session and multiple sessions per user
- Added support for multiple session storages, in cookies as default as well as in db with a custom db adapter, can be
  toggled by setting `sessionStorageType` to `in-memory`, `in-cookie-only` or `in-custom-db`
- Added new `isAuthenticated` API to check if user is authenticated
- Updated auth module documentation to include new features as well as examples
- Migrated from `vite-library-mode` to `tsup` for better build performance

### What's changed

**Auth Module**

- The underlying layer has been rewritten on top of `createSessionStorage` React Router API
- `JsonStorageAdapter` has been removed in favor of in-cookie session storage
- `MemoryStorageAdapter` has been removed since it was doing nothing
- `requireAccessToken` auth API has been removed since it was an assumption that token is always present
- Improved auth module coverage by adding more test cases

### What's fixed

**Auth Module**

- Session ID is now generated uniquely for each session with db-based session storage

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

* add caching system and remove unused
  components ([e9fb8c3](https://github.com/Bonny-kato/r3-utils/commit/e9fb8c3d5b827d59f1800758833835de657ff97b))
* add commitlint, husky, lint-staged, and
  standard-version ([90738bd](https://github.com/Bonny-kato/r3-utils/commit/90738bde191ef4d996959a72faa5c8238cc81423))
* add documentation for core
  modules ([db0273e](https://github.com/Bonny-kato/r3-utils/commit/db0273e0a43d1099d1b50b02df324190c5e5d620))
* **auth, cache:** add modular auth system and cache
  refactor ([0727952](https://github.com/Bonny-kato/r3-utils/commit/07279523083feb131e27985403366096a9b787e9))
* initialize r3-utils project with base
  setup ([6b1d771](https://github.com/Bonny-kato/r3-utils/commit/6b1d771ed24751063838f99b330bee0710ec8f8e))
* update package metadata and release
  scripts ([f33ca3b](https://github.com/Bonny-kato/r3-utils/commit/f33ca3b2f373ccf045d1f9da29677aede30ce132))
* update package metadata and release
  scripts ([06e4d55](https://github.com/Bonny-kato/r3-utils/commit/06e4d55938790505fa5dceb41cc273f0be8aaeea))
