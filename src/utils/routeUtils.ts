import { createPath, Path } from 'react-router';

/**
 * Creates a URL string from a path object with optional query parameters.
 * 
 * @param path - The base path object (pathname, search, hash)
 * @param params - Optional query parameters to add to the URL
 * @returns A formatted URL string
 * 
 * @example
 * ```ts
 * // Basic usage
 * const url = createUrl({ pathname: '/products' });
 * // Result: "/products"
 * 
 * // With query parameters
 * const url = createUrl({ pathname: '/products' }, { category: 'electronics', sort: 'price' });
 * // Result: "/products?category=electronics&sort=price"
 * 
 * // With hash
 * const url = createUrl({ pathname: '/products', hash: 'top' }, { category: 'electronics' });
 * // Result: "/products?category=electronics#top"
 * ```
 */
export function createUrl(path: Path, params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) {
    return createPath(path);
  }

  const searchParams = new URLSearchParams(path.search);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      searchParams.delete(key);
    } else {
      searchParams.set(key, value);
    }
  });

  const search = searchParams.toString();

  return createPath({
    ...path,
    search: search ? `?${search}` : '',
  });
}

/**
 * Extracts route parameters from a path pattern and a URL.
 * 
 * @param pattern - The route pattern with parameter placeholders (e.g., '/users/:id')
 * @param url - The actual URL to extract parameters from
 * @returns An object containing the extracted parameters
 * 
 * @example
 * ```ts
 * const params = extractRouteParams('/users/:id/posts/:postId', '/users/123/posts/456');
 * // Result: { id: '123', postId: '456' }
 * ```
 */
export function extractRouteParams(pattern: string, url: string): Record<string, string> {
  const patternParts = pattern.split('/').filter(Boolean);
  const urlParts = url.split('/').filter(Boolean);

  const params: Record<string, string> = {};

  patternParts.forEach((part, index) => {
    if (part.startsWith(':') && index < urlParts.length) {
      const paramName = part.slice(1);
      params[paramName] = urlParts[index];
    }
  });

  return params;
}
