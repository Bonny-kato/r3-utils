# Cache Module for React Applications

## Introduction

The Cache module provides a flexible and powerful caching solution for React applications. It offers a complete system for storing, retrieving, and managing cached data with features like automatic expiration, event-based notifications, and integration with React Router. This module is designed to improve application performance by reducing unnecessary network requests and providing a seamless user experience.

## Features

- Flexible storage adapters (in-memory, localStorage, and IndexedDB)
- Automatic cache expiration with configurable TTL (Time To Live)
- React hooks for easy integration with components
- Event-based cache invalidation
- Observer pattern to prevent premature garbage collection
- Automatic refetching on window focus and network reconnection
- TypeScript support with generics for type safety

## API

### CacheClient

The main class that manages cache entries and their lifecycle.

```typescript
class CacheClient<TData = unknown> {
  constructor(adapter?: CacheAdapter<TData>);
  
  // Methods
  set(key: string, entry: CacheEntryType<TData>): void;
  get<TData = unknown>(key: string): CacheEntryType<TData> | undefined;
  delete(key: string): void;
  dispatchEvent(eventKey: EventName): void;
  createEventKey(action: CacheActions, key: string): EventName;
  addObserver(key: string): void;
  removeObserver(key: string): void;
  runGc(): void;
  dispatchInvalidateEvent(key: string): void;
}
```

### CacheAdapter Interface

Interface for storage adapters that provide storage functionality for the cache system.

```typescript
interface CacheAdapter<TData = unknown> {
  has: (queryHash: string) => boolean;
  set: (queryHash: string, query: CacheEntryType<TData>) => void;
  get: (queryHash: string) => CacheEntryType<TData> | undefined;
  delete: (queryHash: string) => void;
  values: () => IterableIterator<CacheEntryType<TData>>;
}
```

### React Hooks and Components

#### useFetch

A hook for fetching and caching data from a resource.

```typescript
function useFetch<T extends LoaderFunction>(options: FetchOptions): {
  data: UnwrapNestedPromise<LoaderFuncReturnType<T>> | undefined;
  isLoading: boolean;
  isFetching: boolean;
  key: string;
}
```

#### useCacheClient

A hook to access the cache client from the context.

```typescript
function useCacheClient(): CacheClient;
```

#### CacheProvider

Provider component for the cache system.

```typescript
function CacheProvider({
  cacheClient,
  children,
  gcTime = 60000
}: {
  cacheClient: CacheClient;
  children: ReactNode;
  gcTime?: number;
}): JSX.Element;
```

## Usage Examples

### Basic Setup

```typescript
import { CacheClient, CacheProvider } from 'r3-utils/cache';
import { InMemoryCacheAdapter } from 'r3-utils/cache';

// Create a cache client with the in-memory adapter
const cacheClient = new CacheClient(new InMemoryCacheAdapter());

// Wrap your application with the CacheProvider
function App() {
  return (
    <CacheProvider cacheClient={cacheClient} gcTime={300000}>
      <YourApp />
    </CacheProvider>
  );
}
```

### Using the useFetch Hook

```typescript
import { useFetch } from 'r3-utils/cache';

function UserProfile({ userId }) {
  const { data, isLoading, isFetching } = useFetch({
    resource: `/api/users/${userId}`,
    ttl: 60000, // 1 minute
    cacheKey: `user-${userId}`,
    fetchOnFocus: true,
    fetchOnReconnect: true
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {isFetching && <div>Refreshing...</div>}
      <h1>{data.name}</h1>
      <p>Email: {data.email}</p>
    </div>
  );
}
```

### Manual Cache Operations

```typescript
import { useCacheClient } from 'r3-utils/cache';

function UserActions({ userId }) {
  const cache = useCacheClient();
  
  const handleUpdateUser = async (userData) => {
    // Update user via API
    await updateUserApi(userId, userData);
    
    // Invalidate the cache for this user
    cache.dispatchInvalidateEvent(`user-${userId}`);
  };
  
  const handleClearCache = () => {
    // Manually remove a cache entry
    cache.delete(`user-${userId}`);
  };
  
  return (
    <div>
      <button onClick={handleUpdateUser}>Update User</button>
      <button onClick={handleClearCache}>Clear Cache</button>
    </div>
  );
}
```

### Using LocalStorage Adapter for Persistence

```typescript
import { CacheClient, CacheProvider, LocalStorageCacheAdapter } from 'r3-utils/cache';

// Create a cache client with the localStorage adapter for persistence
const cacheClient = new CacheClient(new LocalStorageCacheAdapter('my-app-cache'));

function App() {
  return (
    <CacheProvider cacheClient={cacheClient}>
      <YourApp />
    </CacheProvider>
  );
}
```

### Using IndexedDB Adapter for Large Data Storage

For storing larger amounts of data or when localStorage size limits are a concern, use the IndexedDB adapter. This adapter provides asynchronous storage with much larger capacity than localStorage.

```typescript
import { CacheClient, CacheProvider, IndexedDBCacheAdapter } from 'r3-utils/cache';

const cacheClient = new CacheClient(new IndexedDBCacheAdapter('my-app-cache'));

function App() {
  return (
    <CacheProvider cacheClient={cacheClient}>
      <YourApp />
    </CacheProvider>
  );
}
```

Note: The IndexedDB adapter provides async methods like `hasAsync()`, `getAsync()`, `setAsync()`, `deleteAsync()`, and `valuesAsync()` in addition to the synchronous CacheAdapter interface methods. The synchronous methods throw errors and should not be used directly. The CacheClient handles this internally.

### Custom Cache Entry with TTL

```typescript
import { useCacheClient, CacheEntryType } from 'r3-utils/cache';

function DataManager() {
  const cache = useCacheClient();
  
  const cacheData = (key, data, ttl = 300000) => {
    const cacheEntry: CacheEntryType = {
      data,
      key,
      ttl, // 5 minutes by default
    };
    
    cache.set(key, cacheEntry);
  };
  
  // Usage
  const handleSaveData = (data) => {
    cacheData('important-data', data, 3600000); // 1 hour TTL
  };
  
  return (
    <button onClick={() => handleSaveData({ value: 'test' })}>
      Save Data
    </button>
  );
}
```

## Best Practices

1. **Choose the Right Adapter**: Use `InMemoryCacheAdapter` for temporary data, `LocalStorageCacheAdapter` for data that should persist across page refreshes with moderate storage needs, and `IndexedDBCacheAdapter` for large datasets or when localStorage size limits are a concern.

2. **Set Appropriate TTL Values**: Consider the volatility of your data when setting TTL values. Frequently changing data should have shorter TTL values.

3. **Use Custom Cache Keys**: When caching data, use descriptive and unique cache keys to avoid collisions and make debugging easier.

4. **Handle Loading States**: Always handle loading and fetching states in your UI to provide a good user experience.

5. **Error Handling**: The `useFetch` hook automatically throws errors to be caught by error boundaries, so make sure to implement error boundaries in your application.

6. **Cache Invalidation**: Use `dispatchInvalidateEvent` to signal that a cache entry should be refreshed without removing it from the cache.

7. **Garbage Collection**: The default garbage collection interval is 1 minute. Adjust the `gcTime` prop of the `CacheProvider` based on your application's needs.

## Integration with React Router

This module is designed to work seamlessly with React Router. The `useFetch` hook uses React Router's `useFetcher` hook internally to fetch data, making it a perfect fit for React Router applications.