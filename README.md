# r3-utils

A library of reusable hooks, utilities, and components for React Router v7.

## Installation

```bash
# Using npm
npm install @bonny-kato/r3-utils

# Using yarn
yarn add @bonny-kato/r3-utils

# Using pnpm
pnpm add @bonny-kato/r3-utils
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
- `@bonny-kato/r3-utils/auth`
- `@bonny-kato/r3-utils/cache`
- `@bonny-kato/r3-utils/access-control`
- `@bonny-kato/r3-utils/hooks`
- `@bonny-kato/r3-utils/http-client`
- `@bonny-kato/r3-utils/utils`
- `@bonny-kato/r3-utils/zod-common`

For more details, see [SUBMODULE_IMPORTS.md](./SUBMODULE_IMPORTS.md).

## Available Utilities, Hooks, and Components

Below is a comprehensive list of all available utilities, hooks, and components organized by submodule.

### Hooks (`@bonny-kato/r3-utils/hooks`)

| Hook | Description |
|------|-------------|
| `useEventListener` | Hook for adding event listeners with automatic cleanup |
| `useBreadcrumb` | Generates breadcrumb navigation based on the current route path |
| `useDebounce` | Debounces a value, useful for search inputs and other scenarios |
| `useIsPathActive` | Determines if a given path is active in the current route |
| `useHandleSelectAllItems` | Manages selection of all items in a list |
| `useHandleSelectItem` | Manages selection of individual items in a list |
| `useLocationState` | Provides access to location state with type safety |
| `useNavigateWithQueryParams` | Navigation hook that preserves query parameters |
| `useScroll` | Manages scroll position and provides scroll-related utilities |
| `useSearchParamsState` | Provides a state-like interface for URL search parameters |
| `useSubmitData` | Simplifies form submission with loading and error states |
| `useUploadFile` | Handles file uploads with progress tracking |

**Components:**
- `LinkWithQueryParams`: A Link component that preserves query parameters

### Utils (`@bonny-kato/r3-utils/utils`)

| Utility | Description |
|---------|-------------|
| `fakeNetwork` | Simulates network latency for testing and development |
| `createSearchParams` | Creates a search params string from an object |
| `parseSearchParams` | Parses a search params string into an object |
| `safeRedirect` | Safely redirects to a URL, preventing open redirects |
| `parseError` | Parses error objects into a standardized format |
| `getDurationFromNow` | Calculates duration between now and a given date |
| `conditionallyAddToArray` | Adds items to an array based on conditions |
| `removeNullish` | Removes nullish values from objects and arrays recursively |
| `formatAmount` | Formats numeric amounts with currency symbols and separators |
| `createEnvSchema` | Creates a schema for environment variables |
| `validateEnv` | Validates environment variables against a schema |

### Auth (`@bonny-kato/r3-utils/auth`)

| Utility | Description |
|---------|-------------|
| `Auth` | Authentication utility class for managing user sessions |
| `JsonStorageAdapter` | Default storage adapter using JSON file for user data storage (development/simple apps) |
| `RedisStorageAdapter` | High-performance storage adapter using Redis for user data storage (production) |
| `AuthStorageAdapter` | Interface for creating custom storage adapters |

#### Authentication System

The authentication system provides a flexible way to manage user sessions with different storage backends.

```typescript
import { Auth, JsonStorageAdapter, RedisStorageAdapter } from "@bonny-kato/r3-utils/auth";

// Using default JSON storage (for development)
const auth = new Auth({
  cookie: {
    name: "session",
    secrets: ["s3cr3t"],
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  },
});

// Using Redis storage (for production)
const auth = new Auth({
  cookie: {
    name: "session",
    secrets: ["s3cr3t"],
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secure: true,
  },
  storageAdapter: new RedisStorageAdapter("auth_users", {
    host: "localhost",
    port: 6379,
    // Additional Redis options
  }),
});

// Example usage in a route handler
export async function loader({ request }) {
  // Get the authenticated user or redirect to login
  const user = await auth.requireUserOrRedirect(request);

  // Get user ID if authenticated, or null
  const userId = await auth.getUserIdOrNull(request);

  // Get authentication token (if user has one)
  const token = await auth.requireToken(request);

  // Get all authenticated users (admin functionality)
  const allUsers = await auth.getAuthUsers(request);

  return { user };
}

// Login handler
export async function action({ request }) {
  const formData = await request.formData();
  const username = formData.get("username");
  const password = formData.get("password");

  // Authenticate user (implementation depends on your system)
  const user = await authenticateUser(username, password);

  if (!user) {
    return { error: "Invalid credentials" };
  }

  // Login and redirect
  return auth.loginAndRedirect(user, "/dashboard");
}

// Logout handler
export async function action({ request }) {
  return auth.logout(request);
}
```

#### Storage Adapters

##### JsonStorageAdapter

Simple storage adapter that uses a JSON file for storing user data. Best for development environments or simple applications.

```typescript
import { JsonStorageAdapter } from "@bonny-kato/r3-utils/auth";

// Create adapter with custom collection name
const jsonAdapter = new JsonStorageAdapter("my_users");

// The adapter will store data in db.json file in your project root
```

##### RedisStorageAdapter

High-performance storage adapter using Redis. Recommended for production environments with high traffic or when scaling across multiple servers.

```typescript
import { RedisStorageAdapter } from "@bonny-kato/r3-utils/auth";

// Create adapter with Redis connection options
const redisAdapter = new RedisStorageAdapter("auth_users", {
  host: "localhost",
  port: 6379,
  password: "optional_password",
  // Additional Redis options as needed
});
```

##### Custom Storage Adapters

You can create custom storage adapters by implementing the `AuthStorageAdapter` interface:

```typescript
import { AuthStorageAdapter, UserId, UserIdentifier } from "@bonny-kato/r3-utils/auth";

class MyCustomAdapter<User extends UserIdentifier> implements AuthStorageAdapter<User> {
  async has(userId: UserId): Promise<boolean> {
    // Implementation
  }

  async get(userId: UserId): Promise<User | undefined> {
    // Implementation
  }

  async set(userId: UserId, data: User): Promise<void> {
    // Implementation
  }

  async remove(userId: UserId): Promise<void> {
    // Implementation
  }

  async getAll(): Promise<User[]> {
    // Implementation
  }
}
```

### Cache (`@bonny-kato/r3-utils/cache`)

| Utility | Description |
|---------|-------------|
| `CacheClient` | Client for caching data with various storage adapters |
| `MemoryAdapter` | In-memory cache adapter |
| `LocalStorageAdapter` | LocalStorage-based cache adapter |

**Components:**
- `CacheProvider`: Provider component for the cache context
- `useCacheContext`: Hook for accessing the cache context

### Access Control (`@bonny-kato/r3-utils/access-control`)

| Utility | Description |
|---------|-------------|
| `AccessControl` | Component for controlling access to UI elements |
| `AccessControlProvider` | Provider component for access control context |
| `useHasAccess` | Hook for checking if a user has access to a resource |
| `requireAccess` | Utility for requiring access to a resource |
| `generateMenuAccessControl` | Generates access control for menu items |
| `generateUserAccessControlConfig` | Generates access control configuration for users |

### HTTP Client (`@bonny-kato/r3-utils/http-client`)

| Utility | Description |
|---------|-------------|
| `HttpClient` | HTTP client for making API requests |
| `tryCatchHttp` | Utility for handling HTTP errors |

### Zod Common (`@bonny-kato/r3-utils/zod-common`)

| Utility | Description |
|---------|-------------|
| `PaginationType` | Zod schema for pagination types |
| `createOptionalRefinement` | Creates optional refinements for Zod schemas |
| `ApiListSchema` | Creates API list schemas |
| `ApiDetailsSchema` | Creates API details schemas |
| `ContainOnlyAlphabetic` | Validates that a string contains only alphabetic characters |
| `SelectInputOptionType` | Zod schema for select input options |
| `NoneEmptyStringSchema` | Creates a schema for non-empty strings |



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
