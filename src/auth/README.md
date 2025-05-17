# Auth Module for React Router Applications

## Introduction

The Auth module provides a comprehensive authentication solution for React Router applications. It offers a flexible and type-safe way to manage user authentication, sessions, and protected routes. This module is designed to work seamlessly with React Router's cookie-based session storage mechanism.

## Features

- Cookie-based session management
- Flexible storage adapters for user data persistence
- Type-safe authentication with TypeScript generics
- Redirect handling for unauthenticated users
- Methods for login, logout, and session management
- Support for custom login and logout URLs

## API

### Auth Class

The main class that provides authentication functionality.

```typescript
class Auth<User extends UserIdentifier> {
  constructor(options: AuthOptions<User>);

  // Methods
  async loginAndRedirect(user: User, redirectTo: string): Promise<Response>;
  async updateSessionAndRedirect(request: Request, user: User, redirectTo: string): Promise<Response>;
  getSession(request: Request);
  async getUserId(request: Request): Promise<string | null>;
  requireUserOrRedirect(request: Request, redirectTo?: string);
  async logout(request: Request): Promise<Response>;
  async requireToken(request: Request): Promise<string>;
  async getUserIdOrNull(request: Request): Promise<string | null>;
  async getAuthUsers(request: Request);
}
```

### AuthOptions Interface

Configuration options for the Auth class.

```typescript
interface AuthOptions<User extends UserIdentifier> {
  storageAdapter?: AuthStorageAdapter<User>;
  collectionName?: string;
  cookie: CookieSessionStorageOptions["cookie"];
  loginPageUrl?: string;
  logoutPageUrl?: string;
}
```

### AuthStorageAdapter Interface

Interface for storage adapters that persist user data.

```typescript
interface AuthStorageAdapter<User extends UserIdentifier> {
  get(id: UserId): Promise<User | null>;
  set(id: UserId, user: User): Promise<void>;
  remove(id: UserId): Promise<void>;
  getAll(): Promise<User[]>;
}
```

## Usage Examples

### Basic Setup

```typescript
import { Auth } from 'r3-utils/auth';
import { JsonStorageAdapter } from 'r3-utils/auth/adapters/json';

// Define your user type
interface User {
  id: string;
  username: string;
  email: string;
  token?: string;
}

// Create an auth instance
const auth = new Auth<User>({
  cookie: {
    name: 'my_app_session',
    secrets: ['s3cr3t'],
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  },
  // Optional: custom storage adapter
  storageAdapter: new JsonStorageAdapter<User>('users'),
  // Optional: custom login/logout URLs
  loginPageUrl: '/signin',
  logoutPageUrl: '/signout',
});
```

### Login Handler

```typescript
// In a login route handler
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  // Validate credentials and get user from your API
  const user = await authenticateUser(username, password);

  if (!user) {
    return json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Get the redirect URL from the query string or use a default
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get('redirectTo') || '/dashboard';

  // Login and redirect
  return auth.loginAndRedirect(user, redirectTo);
}
```

### Protected Route

```typescript
// In a loader function for a protected route
export async function loader({ request }: LoaderFunctionArgs) {
  // This will redirect to login if user is not authenticated
  const user = await auth.requireUserOrRedirect(request);

  // Fetch additional data for the authenticated user
  const userData = await fetchUserData(user.id);

  return json({ user, userData });
}
```

### Logout Handler

```typescript
// In a logout route handler
export async function action({ request }: ActionFunctionArgs) {
  return auth.logoutAndRedirect(request);
}
```

## Adapters

The Auth module uses storage adapters to persist user data. These adapters provide a consistent interface for storing and retrieving user information while allowing flexibility in the underlying storage mechanism.

### Available Adapters

The Auth module comes with two built-in storage adapters:

#### JsonStorageAdapter (Default)

A simple file-based storage adapter that uses JSON files for persistence. This is the default adapter used when no adapter is specified.

```typescript
import { JsonStorageAdapter } from 'r3-utils/auth';

const auth = new Auth<User>({
  cookie: { /* ... */ },
  storageAdapter: new JsonStorageAdapter<User>('users'),
});
```

**Key features:**
- Simple setup with no external dependencies
- Stores data in a local JSON file named 'db.json' in the project root
- Uses SimpleDB under the hood for file operations

**Recommended for:**
- Local development environments
- Simple applications with low traffic
- Prototyping and testing
- Situations where you don't want to set up additional infrastructure

**Not recommended for:**
- Production environments with high traffic
- Applications that need to scale across multiple servers
- Performance-critical applications

#### RedisStorageAdapter

A high-performance adapter that uses Redis for data storage.

```typescript
import { RedisStorageAdapter } from 'r3-utils/auth';

const auth = new Auth<User>({
  cookie: { /* ... */ },
  storageAdapter: new RedisStorageAdapter<User>('users', {
    host: 'localhost',
    port: 6379,
    // Other Redis options
  }),
});
```

**Key features:**
- High performance and scalability
- Uses Redis pipelines for efficient operations
- Stores user data as JSON strings in Redis
- Maintains a set of all user IDs for efficient retrieval

**Recommended for:**
- Production environments
- High-traffic applications
- Applications that need to scale across multiple servers
- Situations where performance is critical

**Requirements:**
- Requires a Redis server
- Depends on the 'ioredis' package

### Adapter Selection Guide

| Adapter | Default | Local Development | Production | Key Advantage | Key Limitation |
|---------|---------|-------------------|------------|---------------|----------------|
| JsonStorageAdapter | ✅ | ✅ Recommended | ❌ Not recommended | Simple setup, no dependencies | Performance limitations with large datasets |
| RedisStorageAdapter | ❌ | ⚠️ Possible but requires Redis | ✅ Recommended | High performance, scalable | Requires Redis server setup |

### Implementing a Custom Adapter

You can create custom storage adapters by implementing the `AuthStorageAdapter` interface. This allows you to integrate with any database or storage system of your choice.

#### Required Methods

To implement a custom adapter, you need to implement the following methods:

| Method | Description | Parameters | Return Type |
|--------|-------------|------------|-------------|
| `has(userId)` | Check if a user exists | `userId: string \| number` | `Promise<boolean>` |
| `get(userId)` | Retrieve user by ID | `userId: string \| number` | `Promise<User \| undefined>` |
| `set(userId, data)` | Create or update user | `userId: string \| number, data: User` | `Promise<void>` |
| `remove(userId)` | Remove user from storage | `userId: string \| number` | `Promise<void>` |
| `getAll()` | List all users | None | `Promise<User[]>` |

#### Example Implementation

Here's an example of a custom adapter that uses a database:

```typescript
import { AuthStorageAdapter, UserId } from 'r3-utils/auth';

class DatabaseStorageAdapter<User extends { id: string }> implements AuthStorageAdapter<User> {
  constructor(private db: Database) {}

  async has(userId: UserId): Promise<boolean> {
    const user = await this.db.users.findOne({ id: userId });
    return !!user;
  }

  async get(userId: UserId): Promise<User | undefined> {
    return this.db.users.findOne({ id: userId });
  }

  async set(userId: UserId, user: User): Promise<void> {
    await this.db.users.upsert({ id: userId }, user);
  }

  async remove(userId: UserId): Promise<void> {
    await this.db.users.delete({ id: userId });
  }

  async getAll(): Promise<User[]> {
    return this.db.users.findAll();
  }
}

// Use with Auth
const auth = new Auth<User>({
  cookie: { /* ... */ },
  storageAdapter: new DatabaseStorageAdapter(myDatabase),
});
```

#### Implementation Tips

When implementing a custom adapter:

1. **Type Safety**: Use TypeScript generics to ensure type safety with your user model
2. **Error Handling**: Implement proper error handling in all methods
3. **Performance**: Consider caching strategies for frequently accessed data
4. **Consistency**: Ensure atomic operations when possible to maintain data consistency
5. **Testing**: Thoroughly test your adapter with various scenarios

You can use the built-in adapters as reference implementations when creating your own.

## Best Practices

1. **Secure Cookies**: Always use `httpOnly` and `secure` (in production) for your cookies to prevent XSS attacks.
2. **Strong Secrets**: Use strong, unique secrets for your cookie encryption.
3. **Type Safety**: Leverage TypeScript generics to ensure type safety throughout your authentication flow.
4. **Custom Redirects**: Use the redirect parameters to create a seamless user experience when redirecting unauthenticated users.
5. **Error Handling**: Implement proper error handling around authentication functions to provide meaningful feedback to users.

## Integration with React Router

This module is designed to work with React Router's session management. It leverages React Router's `createCookieSessionStorage` for managing session cookies, making it a perfect fit for React Router applications.
