# r3-utils

A specialized library of reusable hooks, utilities, and components designed specifically for Remix or  React Router based applications

## Prerequisites

- React Router v7.3.0 or higher
- React v19.0.0 or compatible version

## Installation

```bash
# Using npm
npm install r3-utils

# Using yarn
yarn add r3-utils

# Using pnpm
pnpm add r3-utils
```

Make sure you have the required peer dependencies installed:

```bash
pnpm add react react-dom react-router zod dayjs @bonny-kato/localstorage @bonnykato/simple-db
```

## Features

- 🪝 **Hooks**: Custom React hooks for working with React Router and common web application patterns
- 🛠️ **Utilities**: Helper functions for common tasks like error handling, data validation, and query parameter manipulation
- 🧩 **Components**: Reusable React components that extend React Router functionality
- 📦 **Submodule Imports**: Import only what you need from specific submodules

## Submodule Imports

You can import directly from submodules to improve code organization and potentially reduce bundle size:

```tsx
// Import from specific submodules
import { CacheClient, CacheProvider } from "@bonny-kato/r3-utils/cache";
import { useBreadcrumb, useDebounce } from "@bonny-kato/r3-utils/hooks";
import { removeNullish, parseError } from "@bonny-kato/r3-utils/utils";
```

Available submodules:
- `r3-utils/auth`
- `r3-utils/cache`
- `r3-utils/access-control`
- `r3-utils/hooks`
- `r3-utils/http-client`
- `r3-utils/utils`
- `r3-utils/zod-common`
- `r3-utils/constants`

For more details, see [SUBMODULE_IMPORTS.md](./SUBMODULE_IMPORTS.md).

Each submodule has its own README file with detailed documentation.

## Module Documentation

Each submodule has its own README file with detailed documentation. Please refer to the individual module README files for comprehensive information about the available utilities, hooks, and components:

- [Auth Module](./src/auth/README.md) - Authentication utilities and storage adapters
- [Cache Module](./src/cache/README.md) - Data caching utilities
- [Access Control Module](./src/access-control/README.md) - User permissions management
- [Hooks Module](./src/hooks/README.md) - React hooks for React Router
- [HTTP Client Module](./src/http-client/README.md) - API request utilities
- [Utils Module](./src/utils/README.md) - Helper functions
- [Zod Common Module](./src/zod-common/README.md) - Zod schemas
- [Constants Module](./src/constants/README.md) - Common constants



## Development

```bash
# Install dependencies
pnpm install

# Build the library
pnpm build

# Run linting
pnpm lint

# Format code
pnpm format
```

## License

MIT
