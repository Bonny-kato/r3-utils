# Auth Module for React Router Applications

## Introduction

The Auth module provides a comprehensive authentication solution for [React Router](https://reactrouter.com/)
and [Remix](https://v2.remix.run/docs/start/quickstart/)
applications. It offers a flexible and
type-safe way to manage user authentication, sessions, and protected routes. This module is designed to work seamlessly
with React Router's built-in cookie-based session storage mechanism.

## Features

- Cookie-based session management
- Built-in support for database-based session storage via auth storage adapters
- Built-in support for Redis-based session storage
- Support for custom storage adapters
- Support for both session concurrency and single session per user with database session storage
- Type-safe authentication with TypeScript generics
- Redirect handling for unauthenticated users
- Methods for login, logout, and session management
- Support for custom login route to redirect unauthenticated users

## Usage

### Basic Setup

By default, it works the same as React
Router's [createCookieSessionStorage](https://api.reactrouter.com/v7/functions/react_router.createCookieSessionStorage.html),
meaning all authenticated user data will be stored in a cookie.

> Note: Be aware that data might exceed the cookie size limit of 4KB. If you exceed that limit, React Router will
> [throw an error](https://github.com/remix-run/react-router/blob/b843323a91e3750685198173ff599b6c39afb133/packages/react-router/lib/server-runtime/sessions/cookieStorage.ts#L47).
> If you want to store more data, you can use a different storage type.

#### Example

```ts
import { Auth } from "r3-utils/auth";

type User = {
    id: string; // 👈 must contain id
    username: string;
    // other user data
}

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
})


export const loader = async ({ request }) => {
    // your code here
    const user = await login(request) // authenticate it with your api
    return auth.loginAndRedirect(user, '/dashboard') // redirect to dashboard
}
```

### Advanced Setup with Database

With this setup, you can store your user data in a database. This allows you to store more authenticated user data with
no
limitation. Additionally, with this setup you can control session modality, which can be either single or multiple
sessions per user at
the same time.


> **Note:** This is a custom session storage type built on top of React-Router's
> [createSessionStorage](https://reactrouter.com/explanation/sessions-and-cookies#creating-custom-session-storage),
> which is already hooked into the session storage while allowing consumers to provide their own database session
> storage
> adapter to work with.

To enable this, set `sessionStorageType` to `in-custom-db` and specify your storage adapter if you have one, or you can
use the
built-in production-ready `RedisStorageAdapter`.

#### Example

```ts
import { Auth, RedisStorageAdapter } from "r3-utils/auth";

type User = {
    id: string; // 👈 must contain id
    username: string;
    // other user data
}

const redisStorageAdapter = new RedisStorageAdapter<User>('users', {
    host: 'localhost',
    port: 6379,
    // Other Redis options
});

const auth = new Auth({
    // still need cookie for storing session id in browser
    cookie: {
        name: 'my_app_session',
        secrets: ['s3cr3t'],
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
    },
    enableSingleSession: true, // by default is false, which means users can have many active sessions
    sessionStorageType: "in-custom-db",
    storageAdapter: redisStorageAdapter,
})


export const loader = async ({ request }) => {
    // your code here
    const user = await login(request) // authenticate it with your api
    return auth.loginAndRedirect(user, '/dashboard') // redirect to dashboard
}
```

## Auth APIs

#### loginAndRedirect

After authenticating your user and getting the user object back, you will call the `loginAndRedirect` method to create a
user session and
redirect to the specified route.

```ts
import { auth } from "./auth"

export const loader = async ({ request }) => {
    // your code here
    const user = await login(request) // authenticate it with your api
    return auth.loginAndRedirect(user, '/dashboard') // redirect to dashboard
}
```

### logoutAndRedirect

This method will log out the user and redirect to the specified route if provided, or to the default login route.

```ts
import { auth } from "./auth"

export const loader = async ({ request }) => {
    return auth.logoutAndRedirect(request)
}
```

> **Pro Tip**: You can customize the default login route by setting the `loginRoute` option when creating the auth
> instance.

### updateSession

This method will update user session data. The method allows you to update user data and redirect to the specified
route or return a responseInit object that you will use when returning a response.

**with redirect**

```ts
export const action = async ({ request }) => {

    const updatedInfo = await updateUserInfo(request)
    return auth.updateSession(request, updatedInfo, '/dashboard')
}
```

**without redirect**
This is useful when your action returns a specific format of response that you want to return to the client.

```ts
import { tryCatch } from "./try-catch";
import { data } from "react-router";

export const action = async ({ request }) => {

    const [error, updatedUser] = await tryCatch(async () => {
        return updateUserInfo(request)
    });

    const responseInit = await updateSession(request, updatedInfo);

    return data([errors, updatedUser], responseInit);
}
```

### requireUserOrRedirect

Will return a user object if the user is authenticated or redirect to the login route. Useful when you need to work with
user information.

```ts
import { tryCatch } from "./try-catch";
import { data } from "react-router";

export const loader = async ({ request }) => {
    const user = await auth.requireUserOrRedirect(request);

    const users = httpClient.get("/users", {
        header: {
            Authorization: `Bearer ${user.token}`
        }
    });

    return data(users);
}
```

> **Pro Tip:** You can use this method to protect your loaders and actions by making sure the user is authenticated
> before
> you call your API.

### isAuthenticated

This method will return true if the user is authenticated or false if not. Useful when you need to check if the user is
authenticated.

```ts
import { data } from "react-router";

export const loader = async ({ request }) => {
    const authenticated = await auth.isAuthenticated(request);

    if (!authenticated) {
        // do something
    }
    return data(users);
}
```

## Session Storage Adapters

The auth module comes with first-class support for Redis session storage adapter and a well-designed interface for
creating custom session storage adapters.

### Redis Storage Adapter

This is a production-ready Redis session storage adapter built on top of the [ioredis](https://github.com/redis/ioredis)
package that you can use to store your user data in Redis.

#### Collection name

When you create a new instance of `RedisStorageAdapter`, you need to specify the collection name that will be used to
store your user data.

#### Options

It extends all options from the [ioredis](https://github.com/redis/ioredis) package. The additional options are:

**logging**

- Logging configuration options for the adapter

**redisClient**

- Optional pre-configured Redis client instance to use

**ttl**

- Time-to-live in seconds for session data; will be overwritten when the cookie's maxAge or expires is specified

### Custom Session Storage

Despite the already provided Redis adapter, you may still need to use custom session storage for some reason. In
that case, the auth module comes with first-class support for custom session storage.

For your custom session storage, you need to implement the `AuthStorageAdapter` interface. Here is an example of an
in-memory
custom session storage adapter.

```ts
import { AuthStorageAdapter } from "r3-utils/auth";

export class MemoryStorageAdapter<User extends UserIdentifier>
    implements AuthStorageAdapter<User> {
    readonly #collectionName: string;

    // storage per instance; namespaced by collectionName
    #store: Map<string, SessionData<User>> = new Map();

    // userId -> active sessionId mapping (for single-session feature)
    #sessions: Map<string, string> = new Map();

    constructor(collectionName: string) {
        this.#collectionName = collectionName;
    }

    // ----------------------
    // User-session mappings
    // ----------------------
    setUserSession(
        userId: UserId,
        sessionId: string
    ): Promise<TryCatchResult<boolean>> {
        return tryCatch(async () => {
            this.#sessions.set(String(userId), sessionId);
            return true;
        });
    }

    getUserActiveSession(
        userId: UserId
    ): Promise<TryCatchResult<string | null>> {
        return tryCatch(async () => {
            return this.#sessions.get(String(userId)) ?? null;
        });
    }

    removeUserSession(userId: UserId): Promise<TryCatchResult<boolean>> {
        return tryCatch(async () => {
            return this.#sessions.delete(String(userId));
        });
    }

    async remove(sessionId: string) {
        return tryCatch(async () => {
            const key = this.#generateKey(sessionId);
            const [error, exists] = await this.has(sessionId);
            if (error) return false;
            if (exists) return this.#store.delete(key);
            return true;
        });
    }

    async get(sessionId: string) {
        return tryCatch(async () => {
            const key = this.#generateKey(sessionId);
            return this.#store.get(key) ?? null;
        });
    }

    async has(sessionId: string) {
        return tryCatch<boolean>(async () => {
            const key = this.#generateKey(sessionId);
            const sessionData = this.#store.get(key);

            return Boolean(sessionData);
        });
    }

    async set(sessionId: string, data: User, expires?: Date) {
        return tryCatch<SessionData<User>>(async () => {
            const key = this.#generateKey(sessionId);

            const sessionData: SessionData<User> = { user: data, expires };
            this.#store.set(key, sessionData);

            return sessionData;
        });
    }

    update(sessionId: string, data: Partial<User>, expires?: Date) {
        return tryCatch<SessionData<User>>(async () => {
            const [getErr, existing] = await this.get(sessionId);
            if (getErr) throw getErr;
            if (!existing)
                throw new Error(
                    `User with session id ${String(sessionId)} not found`
                );

            const updatedUser = { ...existing.user, ...data } as User;
            const [setErr, result] = await this.set(
                sessionId,
                updatedUser,
                expires
            );
            if (setErr) throw setErr;
            return result!;
        });
    }

    clear() {
        this.#store.clear();
        this.#sessions.clear();
    }

    #generateKey(sessionId: string) {
        return `${this.#collectionName}:${String(sessionId)}`;
    }
}
```

Here is how you can use it with auth.

```ts
const inMemoryStorageAdapter = new MemoryStorageAdapter<User>('users');

const auth = new Auth({
    // still need cookie for storing session id in browser
    cookie: {
        name: 'my_app_session',
        secrets: ['s3cr3t'],
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
    },
    enableSingleSession: true, // by default is false, which means users can have many active sessions
    sessionStorageType: "in-custom-db",
    storageAdapter: inMemoryStorageAdapter,
})
```

```typescript
// In a logout route handler
export async function action({ request }: ActionFunctionArgs) {
    return auth.logoutAndRedirect(request);
}
```

## Testing

The auth module provides support for testing your authentication flow. You can test both session storage types (
in-memory
and in-custom-db).

### in-memory storage

This is built on top
of [createMemorySessionStorage](https://reactrouter.com/api/utils/createMemorySessionStorage#creatememorysessionstorage).
To enable it, set `sessionStorageType="in-memory"` when writing unit or integration
tests. This keeps the session state entirely in the Node.js process memory, so there is no external dependency (
DB/Redis),
and each test run starts from a clean slate.

> **Important:** In-memory storage is intended for tests and local experimentation only. It is not persistent and must
> not
> be used in production.

Example:

```ts
import { Auth } from "r3-utils/auth";

// Define the minimal user shape your app uses in tests
type TestUser = { id: string; username?: string; token?: string };

// Create an Auth instance that uses in-memory session storage
export const auth = new Auth<TestUser>({
    sessionStorageType: "in-memory",
    cookie: {
        name: "__test_session",
        secrets: ["test_secret"],
        sameSite: "lax",
        path: "/",
        // Optionally shorten cookie lifetime in tests
        // maxAge: 60, // 60 seconds
    },
});
```

### in-custom-db

You can create an in-memory storage adapter and use it as your storage adapter for testing, or you can install the
`ioredis-mock`
package and pass it as an optional parameter in RedisStorageAdapter.

Example:

```ts
import RedisMock from "ioredis-mock";

const redisClient = new RedisMock();

export const mockRedisAdapter = new RedisStorageAdapter<TestUser>(
    COLLECTION_NAME,
    {
        redisClient,
    }
);

const auth = new Auth<TestUser>({
    cookie: {
        name: "__test_session",
        secrets: ["your_session_secret_here"],
    },
    sessionStorageType: "in-custom-db",
    storageAdapter: mockRedisAdapter,
    ...overrides,
});
```

### Typical test flow (Vitest/Jest)

1. Call `loginAndRedirect(user, redirectTo)` to simulate a successful login.
2. Read the `Set-Cookie` header from the response and carry it into subsequent requests via the `Cookie` header.
3. Use `isAuthenticated(request)` or `requireUserOrRedirect(request)` in later steps to assert auth state.

```ts
import { describe, it, expect } from "vitest";

// helper to create a Request with an optional cookie
const req = (url: string, cookie?: string) =>
    new Request(`http://localhost${url}`, {
        headers: cookie ? { Cookie: cookie } : undefined,
    });

it("logs in and stays authenticated across requests", async () => {
    // 1) perform login
    const res = await auth.loginAndRedirect({ id: "u1", username: "Jane" }, "/");
    const cookie = res.headers.get("set-cookie")!.split(";")[0];

    // 2) subsequent request includes the cookie
    const request2 = req("/protected", cookie);
    const authed = await auth.isAuthenticated(request2);
    expect(authed).toBe(true);
});
```

### Tips

- You still need to provide a cookie configuration; the cookie holds the session ID even in in-memory mode.
- Features that depend on database adapters (like `enableSingleSession`) are only available with
  `sessionStorageType: "in-custom-db"`.
- If you later switch to Redis or a custom adapter, your test code can largely stay the same—only the
  `sessionStorageType` and adapter need to change.

## Copy and Paste

Sometimes you may want to copy and paste the code from this package into your own project. Here is a guide on how to do
it:

1. Copy the auth folder into your project.
2. Copy dependency utilities (e.g., `tryCatch` from `src/auth/utils`) used in `AuthStorageAdapter` type.
3. Create HTTP status constants, only the ones used in `auth.ts` and testing files if you are using them.
4. Install Redis dependency if you are using the Redis storage adapter.
5. If you don't need testing files, you can safely remove them.

> Important: You need to be using react-router ^7.0.0 to use this module.

## Known Issues

- As of now, single session works correctly when enabled from the beginning. However, if it was previously multi-session
  and you enable single session, the previous sessions will not be removed—only new ones. This will be fixed in the
  future.

## Best Practices

1. **Secure Cookies**: Always use `httpOnly` and `secure` (in production) for your cookies to prevent XSS attacks.
2. **Strong Secrets**: Use strong, unique secrets for your cookie encryption.
3. **Cookie Expiration**: Always set an expiration date for your cookies to prevent them from persisting indefinitely.
   You can use the `maxAge` or `expires` option.
4. **Type Safety**: Leverage TypeScript generics to ensure type safety throughout your authentication flow.
5. **Database Session Storage**: Use database session storage for production if you need to store more data.