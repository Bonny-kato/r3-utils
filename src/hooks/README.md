# Hooks Module for React Applications

## Introduction

The Hooks module provides a collection of reusable React hooks that simplify common tasks in React applications. These hooks are organized into categories for event handling, navigation and routing, UI and interaction, and data handling. Each hook is designed to be type-safe, well-tested, and easy to use.

## Available Hooks

### Event Handling

#### useEventListener

A hook that registers an event listener and removes it when the component unmounts. Uses AbortController for cleanup.

```typescript
function useEventListener(
  eventName: keyof WindowEventMap | string,
  callback: VoidFunction,
  options?: EventListenerOptions
): void
```

**Example:**
```typescript
import { useEventListener } from 'r3-utils/hooks';

function MyComponent() {
  useEventListener('scroll', () => {
    console.log('Window scrolled!');
  });
  
  return <div>Scroll the window</div>;
}
```

### Navigation and Routing

#### useBreadcrumb

A hook for managing breadcrumb navigation in your application.

#### useIsPathActive

A hook that checks if a given path is active in the current route.

#### useLocationState

A hook for accessing and managing location state in React Router.

#### useNavigateWithQueryParams

A hook that provides a navigation function that preserves the current query parameters.

```typescript
function useNavigateWithQueryParams(): (to: string, options?: NavigateOptions) => void
```

**Example:**
```typescript
import { useNavigateWithQueryParams } from 'r3-utils/hooks';

function ProductList() {
  const navigateWithParams = useNavigateWithQueryParams();
  
  const handleCategoryClick = (categoryId) => {
    // If current URL is /products?page=2&q=shoes
    navigateWithParams(`/categories/${categoryId}`);
    // Will navigate to /categories/123?page=2&q=shoes
  };
  
  return (
    <button onClick={() => handleCategoryClick('123')}>
      View Category
    </button>
  );
}
```

#### LinkWithQueryParams

A Link component that preserves the current query parameters when navigating.

```typescript
const LinkWithQueryParams: ForwardRefExoticComponent<LinkProps & RefAttributes<HTMLAnchorElement>>
```

**Example:**
```typescript
import { LinkWithQueryParams } from 'r3-utils/hooks';

function Navigation() {
  return (
    <nav>
      {/* If current URL is /products?page=2&q=shoes */}
      <LinkWithQueryParams to="/categories">Categories</LinkWithQueryParams>
      {/* Will navigate to /categories?page=2&q=shoes */}
    </nav>
  );
}
```

#### useNavigationState

A hook for managing navigation state in React Router.

### UI and Interaction

#### useDebounce

A hook that returns a debounced function that delays the execution of the provided callback.

```typescript
function useDebounce<T>(
  callback: (value: T) => void, 
  debounce?: number
): (value: T) => void
```

**Example:**
```typescript
import { useDebounce } from 'r3-utils/hooks';

function SearchComponent() {
  const handleSearch = (query) => {
    // Perform search operation with query
    fetchSearchResults(query);
  };
  
  // Create a debounced version of the search handler (500ms delay)
  const debouncedSearch = useDebounce(handleSearch, 500);
  
  return (
    <input 
      type="text" 
      placeholder="Search..." 
      onChange={(e) => debouncedSearch(e.target.value)} 
    />
  );
}
```

#### useScroll

A hook for tracking and controlling scroll position.

#### useSearchParamsState

A hook for managing search parameters in the URL as state.

### Data Handling

#### useHandleSelectItem and useHandleSelectAllItems

Hooks for managing item selection in lists and tables.

#### useSubmitData

A hook for submitting form data with loading and error states.

#### useUploadFile

A hook for handling file uploads with progress tracking.

## Usage Examples

### Combining Multiple Hooks

```typescript
import { 
  useDebounce, 
  useSearchParamsState, 
  useEventListener 
} from 'r3-utils/hooks';

function ProductSearch() {
  const [searchParams, setSearchParams] = useSearchParamsState();
  
  // Update URL when search changes
  const updateSearch = (query) => {
    setSearchParams({ ...searchParams, q: query, page: 1 });
  };
  
  // Debounce the search to avoid too many URL updates
  const debouncedSearch = useDebounce(updateSearch, 300);
  
  // Reset search when user presses Escape
  useEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      updateSearch('');
    }
  });
  
  return (
    <input
      type="text"
      value={searchParams.q || ''}
      onChange={(e) => debouncedSearch(e.target.value)}
      placeholder="Search products..."
    />
  );
}
```

### Creating a Scrollable Component with Scroll Tracking

```typescript
import { useScroll, useEventListener } from 'r3-utils/hooks';

function ScrollableContent() {
  const { scrollY, scrollToTop } = useScroll();
  
  // Show "back to top" button when scrolled down
  const showBackToTop = scrollY > 300;
  
  // Lazy load images when scrolled into view
  useEventListener('scroll', () => {
    const images = document.querySelectorAll('.lazy-image');
    images.forEach(img => {
      if (isInViewport(img)) {
        img.src = img.dataset.src;
      }
    });
  });
  
  return (
    <div className="scrollable-content">
      {/* Content here */}
      
      {showBackToTop && (
        <button 
          className="back-to-top"
          onClick={scrollToTop}
        >
          Back to Top
        </button>
      )}
    </div>
  );
}
```

## Best Practices

1. **Import Only What You Need**: Import only the specific hooks you need rather than importing everything from the module.

2. **Combine Hooks for Complex Logic**: Combine multiple hooks to create more complex functionality while keeping your components clean and focused.

3. **Custom Hook Composition**: Use these hooks as building blocks for your own custom hooks to encapsulate component-specific logic.

4. **TypeScript Integration**: Take advantage of the type safety provided by these hooks to catch errors at compile time.

5. **Performance Considerations**: Use hooks like `useDebounce` to optimize performance for expensive operations like search or filtering.

## Integration with React Router

Many of these hooks are designed to work seamlessly with React Router, providing enhanced functionality for navigation, routing, and URL parameter management. Make sure you have React Router installed and properly set up in your application to use these hooks effectively.