# HTTP Client Module

## Introduction

The HTTP Client module provides a simple and consistent way to make API requests in JavaScript/TypeScript applications. It offers a clean interface for common HTTP methods (GET, POST, PUT, PATCH, DELETE) with built-in error handling, authentication support, and request configuration. The module is designed to work with REST APIs and uses Axios under the hood for making the actual HTTP requests.

## Features

- Simple interface for common HTTP methods
- Built-in error handling with standardized error format
- Authentication support via Bearer tokens
- Automatic content type detection (JSON vs FormData)
- Development mode logging for debugging
- TypeScript support with generics for type safety

## API

### HttpClient Class

The main class for making HTTP requests.

```typescript
class HttpClient {
  constructor(config: HttpRequestConfig);

  // HTTP Methods
  get<TData, TError extends ErrorType = ErrorType>(
    endpoint: string, 
    config?: HttpMethodRequestConfig
  ): Promise<[TError | null, TData | null]>;

  post<TData, TError extends ErrorType = ErrorType>(
    endpoint: string, 
    data: object, 
    config?: HttpMethodRequestConfig
  ): Promise<[TError | null, TData | null]>;

  put<TData, TError extends ErrorType = ErrorType>(
    endpoint: string, 
    data: object, 
    config?: HttpMethodRequestConfig
  ): Promise<[TError | null, TData | null]>;

  patch<TData, TError extends ErrorType = ErrorType>(
    endpoint: string, 
    data: object, 
    config?: HttpMethodRequestConfig
  ): Promise<[TError | null, TData | null]>;

  delete<TData, TError extends ErrorType = ErrorType>(
    endpoint: string, 
    config?: HttpMethodRequestConfig
  ): Promise<[TError | null, TData | null]>;
}

// Configuration options for initializing the HttpClient
type HttpRequestConfig = {
  /** Base URL for all API requests */
  baseUrl: string;
  /** Optional headers to include with all requests */
  headers?: RawAxiosRequestHeaders;
  /** Whether to log request details to the console */
  logRequests?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
};

// Configuration options for individual HTTP method requests
interface HttpMethodRequestConfig {
  /** Base URL override for this specific request */
  baseUrl?: string;
  /** Custom headers for this specific request */
  headers?: RawAxiosRequestHeaders;
  /** AbortSignal to cancel request */
  signal?: AbortSignal;
  /** Auth token to include in request */
  token?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}
```

### Error Handling

The module uses a tuple-based approach for error handling, where each method returns a promise that resolves to a tuple of `[error, data]`. This allows for more predictable error handling without try-catch blocks.

```typescript
interface ErrorType {
  message: string;
  status: number;
}

type TryCatchHttpReturnType<T> = [null, T] | [ErrorType, null];
```

## Usage Examples

### Basic Setup

```typescript
import { HttpClient } from 'r3-utils/http-client';

// Create a new HTTP client instance
const api = new HttpClient({
  baseUrl: 'https://api.example.com/v1',
  logRequests: true // Enable request logging in development
});
```

### Making GET Requests

```typescript
// Define the expected response type
interface User {
  id: string;
  name: string;
  email: string;
}

async function getUser(userId: string, authToken?: string) {
  const [error, user] = await api.get<User>(`/users/${userId}`, {
    token: authToken,
    // You can also specify other options:
    // signal: abortController.signal,
    // timeout: 5000,
  });

  if (error) {
    console.error(`Failed to fetch user: ${error.message}`);
    return null;
  }

  return user;
}
```

### Making POST Requests with Authentication

```typescript
interface CreateUserRequest {
  name: string;
  email: string;
  role: string;
}

interface CreateUserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

async function createUser(userData: CreateUserRequest, authToken: string) {
  const [error, response] = await api.post<CreateUserResponse>(
    '/users',
    userData,
    {
      token: authToken,
      // You can also specify other options:
      // headers: { 'X-Custom-Header': 'value' },
      // timeout: 10000,
    }
  );

  if (error) {
    if (error.status === 401) {
      // Handle authentication error
      console.error('Authentication failed');
    } else {
      // Handle other errors
      console.error(`Failed to create user: ${error.message}`);
    }
    return null;
  }

  return response;
}
```

### Uploading Files

```typescript
async function uploadProfileImage(userId: string, imageFile: File, authToken: string) {
  // Create FormData object
  const formData = new FormData();
  formData.append('image', imageFile);

  const [error, response] = await api.post(
    `/users/${userId}/profile-image`,
    formData,
    {
      token: authToken,
      headers: {
        // No need to set Content-Type for FormData, Axios handles it automatically
        'X-Upload-Type': 'profile-image'
      }
    }
  );

  if (error) {
    console.error(`Failed to upload image: ${error.message}`);
    return false;
  }

  return true;
}
```

### Handling Different Response Types

```typescript
// Generic function to handle API responses

type UserErrorResponse = {
    message:number,
    status:number
    errorCode:number
}

type UserResponse = {
    name:string,
    email:string
}


const [error, users] = api.get<UserResponse, UserErrorResponse>('/users/123');
// Usage
const user = await handleApiRequest(
  api.get<User>('/users/123'),
  (error) => {
    if (error.status === 404) {
      console.error('User not found');
    } else {
      console.error(`Failed to fetch user: ${error.message}`);
    }
  }
);
```

## Best Practices

1. **Type Your Responses**: Always specify the expected response type using TypeScript generics for better type safety.

2. **Centralize API Calls**: Create service modules that use the HttpClient to make API calls, rather than using the HttpClient directly in components.

3. **Handle Errors Appropriately**: Always check for errors before using the response data. Consider creating custom error handlers for different types of errors.

4. **Authentication Management**: Store and manage authentication tokens securely, and consider implementing automatic token refresh.

5. **Request Cancellation**: For long-running requests, implement request cancellation using AbortController when the component unmounts.

6. **Environment Configuration**: Use environment variables to configure the base URL for different environments (development, staging, production).

## Integration with React

While the HttpClient is framework-agnostic, it can be easily integrated with React applications:

```typescript
// api.ts
import { HttpClient } from 'r3-utils/http-client';

export const api = new HttpClient(process.env.REACT_APP_API_URL);

// useApi.ts
import { useState, useEffect } from 'react';
import { api } from './api';

export function useApi<T>(endpoint: string, token?: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      const [err, response] = await api.get<T>(endpoint, token);

      if (!isMounted) return;

      setLoading(false);

      if (err) {
        setError(err.message);
      } else {
        setData(response);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [endpoint, token]);

  return { data, error, loading };
}

// Usage in a component
function UserProfile({ userId, token }) {
  const { data: user, error, loading } = useApi<User>(`/users/${userId}`, token);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```
