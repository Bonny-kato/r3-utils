# r3-utils

A library of reusable hooks, utilities, and components for React Router v7.

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
pnpm add react react-dom react-router react-router-dom @remix-run/router
```

## Features

- 🪝 **Hooks**: Custom React hooks for working with React Router
- 🛠️ **Utilities**: Helper functions for common routing tasks
- 🧩 **Components**: Reusable React components that extend React Router functionality

## Usage

### Hooks

#### useQueryParams

A hook that provides access to the URL query parameters with type safety.

```tsx
import { useQueryParams } from 'r3-utils';

function SearchPage() {
  const { queryParams, setQueryParams } = useQueryParams<{ 
    query: string;
    page: string;
    sort: string;
  }>();
  
  // Access query parameters
  const currentPage = queryParams.page || '1';
  const searchQuery = queryParams.query || '';
  
  // Update query parameters
  const goToNextPage = () => {
    setQueryParams({ page: String(Number(currentPage) + 1) });
  };
  
  return (
    <div>
      <p>Search query: {searchQuery}</p>
      <p>Current page: {currentPage}</p>
      <button onClick={goToNextPage}>Next Page</button>
    </div>
  );
}
```

### Utilities

#### createUrl

Creates a URL string from a path object with optional query parameters.

```tsx
import { createUrl } from 'r3-utils';

// Basic usage
const url = createUrl({ pathname: '/products' });
// Result: "/products"

// With query parameters
const url = createUrl(
  { pathname: '/products' }, 
  { category: 'electronics', sort: 'price' }
);
// Result: "/products?category=electronics&sort=price"

// With hash
const url = createUrl(
  { pathname: '/products', hash: 'top' }, 
  { category: 'electronics' }
);
// Result: "/products?category=electronics#top"
```

#### extractRouteParams

Extracts route parameters from a path pattern and a URL.

```tsx
import { extractRouteParams } from 'r3-utils';

const params = extractRouteParams('/users/:id/posts/:postId', '/users/123/posts/456');
// Result: { id: '123', postId: '456' }
```

### Components

#### LinkWithQuery

A Link component that preserves the current query parameters by default.

```tsx
import { LinkWithQuery } from 'r3-utils';

function Navigation() {
  return (
    <nav>
      {/* Preserves current query params */}
      <LinkWithQuery to="/products">Products</LinkWithQuery>
      
      {/* Disable query preservation */}
      <LinkWithQuery to="/home" preserveQuery={false}>Home</LinkWithQuery>
      
      {/* Works with location objects too */}
      <LinkWithQuery to={{ pathname: '/products', hash: 'top' }}>
        Products (Top)
      </LinkWithQuery>
    </nav>
  );
}
```

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
