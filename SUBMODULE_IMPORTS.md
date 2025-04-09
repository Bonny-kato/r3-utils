# Submodule Imports for @ipf-frontier/r3-utils

This document explains how to use submodule imports for the `@ipf-frontier/r3-utils` package.

## Overview

The `@ipf-frontier/r3-utils` package now supports direct imports from submodules. This allows you to import only the specific components, hooks, or utilities you need, potentially reducing bundle size and improving code organization.

## Available Submodules

The following submodules are available for direct import:

- `@ipf-frontier/r3-utils/auth`: Authentication utilities
- `@ipf-frontier/r3-utils/cache`: Caching utilities and components
- `@ipf-frontier/r3-utils/access-control`: Access control utilities
- `@ipf-frontier/r3-utils/hooks`: React hooks
- `@ipf-frontier/r3-utils/http-client`: HTTP client utilities
- `@ipf-frontier/r3-utils/utils`: General utilities
- `@ipf-frontier/r3-utils/zod-common`: Zod schema utilities

## Usage Examples

### Before

```typescript
import { CacheClient, CacheProvider } from "@ipf-frontier/r3-utils";
import { useFetch, type FetchOptionsWithoutResource } from "@ipf-frontier/r3-utils";
```

### After

```typescript
import { CacheClient, CacheProvider } from "@ipf-frontier/r3-utils/cache";
import { useFetch, type FetchOptionsWithoutResource } from "@ipf-frontier/r3-utils/cache";
```

## Backward Compatibility

The main package import (`@ipf-frontier/r3-utils`) still works as before, so existing code will continue to function without changes. However, we recommend migrating to submodule imports for better code organization and potential performance benefits.

## Implementation Details

This feature is implemented using the `exports` field in the package.json file, which defines entry points for each submodule. The build process generates individual JavaScript files and TypeScript declaration files for each submodule.
